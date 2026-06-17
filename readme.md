# BigQuery Release Notes Explorer & Tweet Sharer

A modern, high-fidelity web application built with **Python Flask** and **Vanilla HTML, JavaScript, and CSS**. This application parses Google Cloud's BigQuery release notes Atom feed and provides an interactive dashboard where users can filter, search, and instantly draft and share updates to X (Twitter).

---

## 🚀 Key Features

- **Categorized Feed**: Automatically parses daily release batches and splits them into distinct, easy-to-read cards categorized by update type (**Feature**, **Announcement**, **Fix**, **Deprecation**, and **Issue**).
- **Search & Filters**: Real-time interactive text search and type filter pills to quickly find relevant updates.
- **Tweet Composer**: Click any card to instantly load the update into a custom X/Twitter draft editor.
- **Auto-Formatting**: Generates tweet text that automatically includes the update category, date, short description snippet, source documentation link, and relevant hashtags, while strictly enforcing the **280-character limit**.
- **Interactive UI**: Sleek, responsive, and responsive dark-theme design featuring subtle glow spots, glassmorphic cards, loading skeletons, custom progress rings, and notification toasts.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, XML ElementTree (standard library)
- **Frontend**: HTML5, Vanilla CSS3 (custom responsive layouts), Vanilla JavaScript (ES6)
- **Icons**: Lucide Icons

---

## 📁 Project Structure

```
├── app.py                # Flask server & XML parsing endpoint
├── requirements.txt      # Python dependencies list
├── readme.md             # Project documentation (this file)
├── .gitignore            # Git exclusion patterns
├── templates/
│   └── index.html        # Single-page dashboard template
└── static/
    ├── css/
    │   └── style.css     # CSS stylesheet for dark mode UI
    └── js/
        └── app.js        # Frontend logic (fetching, filtering, tweet drafting)
```

---

## 🏃 Run the Application Locally

### 1. Prerequisites
Ensure you have **Python 3** installed on your system.

### 2. Install Dependencies
Navigate to the root directory and install Flask and other dependencies:
```bash
pip install -r requirements.txt
```

### 3. Start the Server
Launch the Flask development server:
```bash
python app.py
```
*(By default, the server runs on port **5001** to prevent conflicts with AirPlay Receiver on macOS).*

### 4. Open in Browser
Visit the following URL:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 📝 License
This project is open-source and available under the MIT License.
