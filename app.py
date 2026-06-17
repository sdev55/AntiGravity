import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__, static_folder='static', template_folder='templates')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACE = {'atom': 'http://www.w3.org/2005/Atom'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        entries = []
        for entry in root.findall('atom:entry', NAMESPACE):
            title_elem = entry.find('atom:title', NAMESPACE)
            title = title_elem.text if title_elem is not None else "Unknown Date"
            
            id_elem = entry.find('atom:id', NAMESPACE)
            id_val = id_elem.text if id_elem is not None else ""
            
            updated_elem = entry.find('atom:updated', NAMESPACE)
            updated = updated_elem.text if updated_elem is not None else ""
            
            link_elem = entry.find('atom:link[@rel="alternate"]', NAMESPACE)
            if link_elem is None:
                link_elem = entry.find('atom:link', NAMESPACE)
            link = link_elem.attrib.get('href') if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', NAMESPACE)
            content = content_elem.text if content_elem is not None else ""
            
            entries.append({
                'id': id_val,
                'title': title,
                'updated': updated,
                'link': link,
                'content': content
            })
            
        return jsonify({
            'status': 'success',
            'entries': entries
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Using port 5001 to avoid AirPlay Receiver conflicts on macOS
    app.run(host='0.0.0.0', port=5001, debug=True)
