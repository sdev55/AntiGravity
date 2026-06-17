document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allUpdates = []; // Parsed individual updates
    let filteredUpdates = [];
    let selectedUpdate = null;
    let currentSearchQuery = '';
    let currentTypeFilter = 'all';
    let lastFetchedTime = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('i');
    const statusText = document.getElementById('status-text');
    const lastUpdatedLabel = document.getElementById('last-updated');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterPills = document.querySelectorAll('.pill');
    const timelineList = document.getElementById('timeline-list');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');
    const btnRetry = document.getElementById('btn-retry');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const toastContainer = document.getElementById('toast-container');

    // Composer Elements
    const composerEmptyState = document.getElementById('composer-empty-state');
    const composerActiveState = document.getElementById('composer-active-state');
    const previewBadge = document.getElementById('preview-badge');
    const previewDate = document.getElementById('preview-date');
    const previewText = document.getElementById('preview-text');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charProgress = document.getElementById('char-progress');
    const charCountText = document.getElementById('char-count-text');
    const btnAddTags = document.getElementById('btn-add-tags');
    const btnShareTweet = document.getElementById('btn-share-tweet');

    // ==========================================================================
    // INITIALIZATION & EVENT LISTENERS
    // ==========================================================================
    fetchReleaseNotes();

    refreshBtn.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);

    // Search Input behavior
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = currentSearchQuery ? 'flex' : 'none';
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
        searchInput.focus();
    });

    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterPills.forEach(p => p.classList.remove('active'));
        document.querySelector('.pill[data-type="all"]').classList.add('active');
        currentTypeFilter = 'all';
        
        applyFilters();
    });

    // Filter Pills behavior
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentTypeFilter = pill.dataset.type;
            applyFilters();
        });
    });

    // Textarea character count and validation
    tweetTextarea.addEventListener('input', updateCharCount);

    // Add Tags to Composer
    btnAddTags.addEventListener('click', () => {
        if (!selectedUpdate) return;
        const currentText = tweetTextarea.value;
        const tags = '#BigQuery #GoogleCloud';
        
        if (!currentText.includes(tags)) {
            // Append with correct spacing
            const connector = currentText.endsWith('\n') ? '' : currentText.endsWith(' ') ? '' : ' ';
            tweetTextarea.value = currentText + connector + tags;
            updateCharCount();
            showToast('Hashtags added!', 'success');
        } else {
            showToast('Hashtags already present', 'error');
        }
    });

    // Share Tweet Action
    btnShareTweet.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (!text) {
            showToast('Tweet content cannot be empty!', 'error');
            return;
        }
        
        if (text.length > 280) {
            showToast('Tweet content exceeds 280 characters limit!', 'error');
            return;
        }

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        showToast('Opening X / Twitter Share Dialog...', 'success');
    });

    // ==========================================================================
    // CORE FUNCTIONS: DATA FETCHING & PARSING
    // ==========================================================================
    async function fetchReleaseNotes() {
        showLoadingState();
        try {
            const response = await fetch('/api/release-notes');
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.status === 'success') {
                parseAndProcessFeed(data.entries);
                lastFetchedTime = new Date();
                updateStatusLabel();
                showToast('Release notes synchronized successfully!', 'success');
            } else {
                throw new Error(data.message || 'Unknown error occurred while parsing');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState(error.message);
            showToast('Failed to fetch release notes', 'error');
        }
    }

    function parseAndProcessFeed(entries) {
        allUpdates = [];
        
        entries.forEach(entry => {
            const parsed = parseReleaseContent(entry.content, entry.title, entry.link);
            allUpdates.push(...parsed);
        });

        // Sort updates by date descending (assuming dates are parses correctly or maintaining feed order)
        // Since feed is chronological descending, keeping the entry list order is perfect.
        applyFilters();
    }

    function parseReleaseContent(htmlContent, entryTitle, entryLink) {
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        const h3s = doc.querySelectorAll('h3');
        const updates = [];
        
        if (h3s.length === 0) {
            // If no specific update headings are present, treat whole entry as one Announcement
            const textContent = doc.body.textContent || doc.body.innerText || '';
            updates.push({
                id: Math.random().toString(36).substring(2, 11),
                type: 'Announcement',
                html: htmlContent,
                text: textContent.trim(),
                date: entryTitle,
                link: entryLink
            });
            return updates;
        }
        
        h3s.forEach((h3) => {
            const type = h3.textContent.trim();
            let contentHtml = '';
            
            // Gather all siblings until the next H3
            let sibling = h3.nextElementSibling;
            while (sibling && sibling.tagName !== 'H3') {
                contentHtml += sibling.outerHTML;
                sibling = sibling.nextElementSibling;
            }
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            // Format tag type to match standard slugs
            let typeNormalized = 'Announcement';
            const typeLower = type.toLowerCase();
            if (typeLower.includes('feature')) typeNormalized = 'Feature';
            else if (typeLower.includes('announcement')) typeNormalized = 'Announcement';
            else if (typeLower.includes('fix')) typeNormalized = 'Fix';
            else if (typeLower.includes('deprecation')) typeNormalized = 'Deprecation';
            else if (typeLower.includes('issue') || typeLower.includes('known issue')) typeNormalized = 'Issue';
            
            updates.push({
                id: Math.random().toString(36).substring(2, 11),
                type: typeNormalized,
                originalType: type,
                html: contentHtml,
                text: textContent.trim(),
                date: entryTitle,
                link: entryLink
            });
        });
        
        return updates;
    }

    // ==========================================================================
    // FILTERING & DOM RENDERING
    // ==========================================================================
    function applyFilters() {
        filteredUpdates = allUpdates.filter(update => {
            // Apply Type filter
            const matchesType = currentTypeFilter === 'all' || 
                                update.type.toLowerCase() === currentTypeFilter;
            
            // Apply Search Query filter
            const matchesSearch = !currentSearchQuery || 
                                  update.text.toLowerCase().includes(currentSearchQuery) ||
                                  update.type.toLowerCase().includes(currentSearchQuery) ||
                                  update.date.toLowerCase().includes(currentSearchQuery);
            
            return matchesType && matchesSearch;
        });

        renderTimeline();
    }

    function renderTimeline() {
        timelineList.innerHTML = '';
        
        if (filteredUpdates.length === 0) {
            showEmptyState();
            resultsCount.textContent = 'No updates match';
            return;
        }
        
        hideLoadingErrorEmpty();
        resultsCount.textContent = `Showing ${filteredUpdates.length} update${filteredUpdates.length > 1 ? 's' : ''}`;
        
        // Group by Date
        const grouped = {};
        filteredUpdates.forEach(update => {
            if (!grouped[update.date]) {
                grouped[update.date] = [];
            }
            grouped[update.date].push(update);
        });

        // Render grouped lists
        Object.entries(grouped).forEach(([date, updates]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = date;
            dateGroup.appendChild(dateHeader);
            
            updates.forEach(update => {
                const card = document.createElement('article');
                card.className = 'release-card';
                card.dataset.id = update.id;
                
                if (selectedUpdate && selectedUpdate.id === update.id) {
                    card.classList.add('selected');
                }
                
                // Color badges matching type
                let tagClass = 'tag-announcement';
                switch(update.type.toLowerCase()) {
                    case 'feature': tagClass = 'tag-feature'; break;
                    case 'fix': tagClass = 'tag-fix'; break;
                    case 'deprecation': tagClass = 'tag-deprecation'; break;
                    case 'issue': tagClass = 'tag-issue'; break;
                }
                
                card.innerHTML = `
                    <div class="card-top">
                        <div class="type-tag-wrapper">
                            <span class="type-tag ${tagClass}">${update.originalType || update.type}</span>
                        </div>
                        <div class="card-actions">
                            <button class="card-action-btn tweet-btn-icon" title="Compose Tweet" aria-label="Compose Tweet for this note">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                            <a href="${update.link}" target="_blank" rel="noopener" class="card-action-btn" title="View Official Docs" aria-label="View Official Docs link">
                                <i data-lucide="external-link"></i>
                            </a>
                        </div>
                    </div>
                    <div class="card-content">
                        ${update.html}
                    </div>
                `;
                
                // Event: Selecting the card
                card.addEventListener('click', (e) => {
                    // Avoid trigger selection on clicking external links
                    if (e.target.closest('a') && !e.target.closest('.tweet-btn-icon')) {
                        return;
                    }
                    
                    selectUpdate(update);
                });
                
                dateGroup.appendChild(card);
            });
            
            timelineList.appendChild(dateGroup);
        });
        
        lucide.createIcons();
    }

    // ==========================================================================
    // COMPOSER LOGIC & TWEET BUILDER
    // ==========================================================================
    function selectUpdate(update) {
        selectedUpdate = update;
        
        // Update all visual cards' selected states
        document.querySelectorAll('.release-card').forEach(card => {
            if (card.dataset.id === update.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Show active state in composer
        composerEmptyState.style.display = 'none';
        composerActiveState.style.display = 'flex';
        
        // Set badges
        let tagClass = 'tag-announcement';
        switch(update.type.toLowerCase()) {
            case 'feature': tagClass = 'tag-feature'; break;
            case 'fix': tagClass = 'tag-fix'; break;
            case 'deprecation': tagClass = 'tag-deprecation'; break;
            case 'issue': tagClass = 'tag-issue'; break;
        }
        
        previewBadge.className = `badge ${tagClass}`;
        previewBadge.textContent = update.type;
        previewDate.textContent = update.date;
        previewText.textContent = update.text;
        
        // Generate prefilled text
        const initialTweetText = generateTweetText(update);
        tweetTextarea.value = initialTweetText;
        updateCharCount();
        
        showToast('Selected update loaded into composer', 'success');
        
        // Smooth scroll to composer sidebar on mobile
        if (window.innerWidth <= 1024) {
            composerActiveState.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function generateTweetText(update) {
        const type = update.type.toUpperCase();
        const date = update.date;
        const link = update.link;
        const tags = ' #BigQuery #GoogleCloud';
        
        // Format: "BigQuery FEATURE (June 17, 2026): "
        const prefix = `BigQuery ${type} (${date}): `;
        
        // Calculate maximum space left for description text
        // Overhead is: prefix, double newlines, link, tags, quotes (2)
        const overheadLen = prefix.length + link.length + tags.length + 6;
        const maxSnippetLen = 280 - overheadLen;
        
        let snippet = update.text;
        if (snippet.length > maxSnippetLen) {
            snippet = snippet.substring(0, maxSnippetLen - 3) + '...';
        }
        
        return `${prefix}"${snippet}"\n\n${link}${tags}`;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const len = text.length;
        charCountText.textContent = 280 - len;
        
        // Update circle progress ring
        const circle = document.getElementById('char-progress');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        const pct = Math.min(len / 280, 1);
        const offset = circumference - (pct * circumference);
        circle.style.strokeDashoffset = offset;
        
        // Color coding depending on proximity to limit
        if (len > 280) {
            circle.style.stroke = '#ef4444'; // Red
            charCountText.style.color = '#ef4444';
            btnShareTweet.disabled = true;
        } else if (len >= 240) {
            circle.style.stroke = '#f97316'; // Orange
            charCountText.style.color = '#f97316';
            btnShareTweet.disabled = false;
        } else {
            circle.style.stroke = '#1DA1F2'; // X / Twitter Blue
            charCountText.style.color = 'var(--color-text-muted)';
            btnShareTweet.disabled = false;
        }
    }

    // ==========================================================================
    // UTILITY FUNCTIONS: STATES & TOASTS
    // ==========================================================================
    function showLoadingState() {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spinning');
        statusText.textContent = 'Synchronizing...';
        
        skeletonLoader.style.display = 'flex';
        timelineList.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function hideLoadingErrorEmpty() {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        
        skeletonLoader.style.display = 'none';
        timelineList.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function showErrorState(msg) {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        statusText.textContent = 'Sync Failed';
        
        skeletonLoader.style.display = 'none';
        timelineList.style.display = 'none';
        errorState.style.display = 'flex';
        emptyState.style.display = 'none';
        errorMessage.textContent = msg || 'Could not parse RSS feed details.';
    }

    function showEmptyState() {
        skeletonLoader.style.display = 'none';
        timelineList.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'flex';
    }

    function updateStatusLabel() {
        statusText.textContent = 'Synchronized';
        if (lastFetchedTime) {
            const timeStr = lastFetchedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lastUpdatedLabel.textContent = `Today at ${timeStr}`;
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
        
        toast.innerHTML = `
            <i data-lucide="${icon}"></i>
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        lucide.createIcons();
        
        // Remove after 3.5s
        setTimeout(() => {
            toast.style.animation = 'none'; // reset animation
            toast.offsetHeight; // trigger reflow
            toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 3500);
    }
});
