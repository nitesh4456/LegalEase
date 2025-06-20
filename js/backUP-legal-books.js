    document.addEventListener("DOMContentLoaded", () => {
    let legalData = null
    let currentSearchResults = []

    // DOM elements
    const searchInput = document.getElementById("legal-search")
    const searchBtn = document.getElementById("search-btn")
    const actFilter = document.getElementById("act-filter")
    const searchType = document.getElementById("search-type")
    const searchResults = document.getElementById("search-results")
    const resultsList = document.getElementById("results-list")
    const resultsCount = document.getElementById("results-count")
    const clearSearchBtn = document.getElementById("clear-search")
    const actsTabsContainer = document.getElementById("acts-tabs")
    const tabContents = document.getElementById("tab-contents")
    const quickReferenceGrid = document.getElementById("quick-reference-grid")
    const loading = document.getElementById("loading")

    // Initialize the page
    init()

    async function init() {
        try {
        loading.classList.remove("hidden")
        await loadLegalData()
        renderTabs()
        renderQuickReference()
        setupEventListeners()
        loading.classList.add("hidden")
        } catch (error) {
        console.error("Error initializing legal books:", error)
        loading.innerHTML = '<div class="error">Error loading legal acts data. Please try again later.</div>'
        }
    }

    async function loadLegalData() {
        try {
        const response = await fetch("data/legal-acts.json")
        if (!response.ok) {
            throw new Error("Failed to load legal acts data")
        }
        legalData = await response.json()
        } catch (error) {
        console.error("Error loading legal data:", error)
        throw error
        }
    }

    function setupEventListeners() {
        // Search functionality
        searchBtn.addEventListener("click", performSearch)
        searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch()
        }
        })

        // Real-time search as user types (debounced)
        let searchTimeout
        searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
            if (searchInput.value.trim().length > 2) {
            performSearch()
            } else if (searchInput.value.trim().length === 0) {
            clearSearch()
            }
        }, 300)
        })

        // Filter changes
        actFilter.addEventListener("change", () => {
        if (searchInput.value.trim()) {
            performSearch()
        }
        })

        searchType.addEventListener("change", () => {
        if (searchInput.value.trim()) {
            performSearch()
        }
        })

        // Clear search
        clearSearchBtn.addEventListener("click", clearSearch)

        // Tab functionality
        const tabBtns = document.querySelectorAll(".tab-btn")
        tabBtns.forEach((btn) => {
        btn.addEventListener("click", function () {
            const tabId = this.getAttribute("data-tab")
            switchTab(tabId)
        })
        })
    }

    function renderTabs() {
        if (!legalData) return

        // Clear existing content
        tabContents.innerHTML = ""

        legalData.acts.forEach((act, index) => {
        // Create tab content
        const tabContent = document.createElement("div")
        tabContent.className = `tab-content ${index === 0 ? "active" : ""}`
        tabContent.id = `${act.id}-tab`

        // Act header
        const actHeader = document.createElement("div")
        actHeader.className = "card mb-4"
        actHeader.innerHTML = `
            <div class="card-header">
            <h2>${act.title}</h2>
            <p>${act.description}</p>
            </div>
        `

        // Chapters list
        const chaptersList = document.createElement("div")
        chaptersList.className = "chapters-list"

        act.chapters.forEach((chapter) => {
            const chapterCard = document.createElement("div")
            chapterCard.className = "chapter-card"

            const chapterHeader = document.createElement("div")
            chapterHeader.className = "chapter-header collapsible"
            chapterHeader.innerHTML = `
            <h3>${chapter.title}</h3>
            <i class="fas fa-chevron-right"></i>
            `

            const chapterContent = document.createElement("div")
            chapterContent.className = "chapter-content"

            chapter.sections.forEach((section) => {
            const sectionItem = document.createElement("div")
            sectionItem.className = "section-item"
            sectionItem.setAttribute("data-section-id", section.id)
            sectionItem.innerHTML = `
                <h4>Section ${section.number}: ${section.title}</h4>
                <p>${section.content}</p>
                <div class="section-keywords">
                <small><strong>Keywords:</strong> ${section.keywords.join(", ")}</small>
                </div>
            `
            chapterContent.appendChild(sectionItem)
            })

            // Add click event for collapsible
            chapterHeader.addEventListener("click", function () {
            const icon = this.querySelector("i")
            chapterContent.classList.toggle("show")

            if (chapterContent.classList.contains("show")) {
                icon.classList.remove("fa-chevron-right")
                icon.classList.add("fa-chevron-down")
            } else {
                icon.classList.remove("fa-chevron-down")
                icon.classList.add("fa-chevron-right")
            }
            })

            chapterCard.appendChild(chapterHeader)
            chapterCard.appendChild(chapterContent)
            chaptersList.appendChild(chapterCard)
        })

        tabContent.appendChild(actHeader)
        tabContent.appendChild(chaptersList)
        tabContents.appendChild(tabContent)
        })
    }

    function renderQuickReference() {
        if (!legalData) return

        quickReferenceGrid.innerHTML = ""

        Object.entries(legalData.quickReference).forEach(([actId, refData]) => {
        const refItem = document.createElement("div")
        refItem.className = "quick-reference-item"

        const sectionsHtml = refData.sections
            .map((section) => `<li>• Section ${section.section}: ${section.title}</li>`)
            .join("")

        refItem.innerHTML = `
            <h4>${refData.title}</h4>
            <ul>${sectionsHtml}</ul>
        `

        // Add click events to sections
        refItem.addEventListener("click", (e) => {
            if (e.target.tagName === "LI") {
            const sectionNumber = e.target.textContent.match(/Section (\d+)/)[1]
            searchForSection(sectionNumber, actId)
            }
        })

        quickReferenceGrid.appendChild(refItem)
        })
    }

    function performSearch() {
        const query = searchInput.value.trim().toLowerCase()
        const actFilterValue = actFilter.value
        const searchTypeValue = searchType.value

        if (!query) {
        clearSearch()
        return
        }

        currentSearchResults = []

        legalData.acts.forEach((act) => {
        // Skip if act filter is applied and doesn't match
        if (actFilterValue !== "all" && act.id !== actFilterValue) {
            return
        }

        act.chapters.forEach((chapter) => {
            chapter.sections.forEach((section) => {
            let isMatch = false
            let matchType = ""
            let matchText = ""

            switch (searchTypeValue) {
                case "section":
                isMatch = section.number.toLowerCase().includes(query)
                matchType = "Section Number"
                matchText = section.number
                break
                case "title":
                isMatch = section.title.toLowerCase().includes(query)
                matchType = "Section Title"
                matchText = section.title
                break
                case "content":
                isMatch = section.content.toLowerCase().includes(query)
                matchType = "Section Content"
                matchText = highlightMatch(section.content, query)
                break
                case "keywords":
                isMatch = section.keywords.some((keyword) => keyword.toLowerCase().includes(query))
                matchType = "Keywords"
                matchText = section.keywords.filter((keyword) => keyword.toLowerCase().includes(query)).join(", ")
                break
                default: // 'all'
                if (section.number.toLowerCase().includes(query)) {
                    isMatch = true
                    matchType = "Section Number"
                    matchText = section.number
                } else if (section.title.toLowerCase().includes(query)) {
                    isMatch = true
                    matchType = "Section Title"
                    matchText = section.title
                } else if (section.content.toLowerCase().includes(query)) {
                    isMatch = true
                    matchType = "Section Content"
                    matchText = highlightMatch(section.content, query)
                } else if (section.keywords.some((keyword) => keyword.toLowerCase().includes(query))) {
                    isMatch = true
                    matchType = "Keywords"
                    matchText = section.keywords.filter((keyword) => keyword.toLowerCase().includes(query)).join(", ")
                }
            }

            if (isMatch) {
                currentSearchResults.push({
                act: act,
                chapter: chapter,
                section: section,
                matchType: matchType,
                matchText: matchText,
                })
            }
            })
        })
        })

        displaySearchResults()
    }

    function highlightMatch(text, query) {
        const regex = new RegExp(`(${escapeRegExp(query)})`, "gi")
        return text.replace(regex, "<mark>$1</mark>")
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    }

    function displaySearchResults() {
        if (currentSearchResults.length === 0) {
        searchResults.classList.add("hidden")
        return
        }

        resultsCount.textContent = `Search Results (${currentSearchResults.length} found)`
        resultsList.innerHTML = ""

        currentSearchResults.forEach((result) => {
        const resultItem = document.createElement("div")
        resultItem.className = "search-result-item"

        resultItem.innerHTML = `
            <div class="result-header">
            <div class="result-act-info">
                <span class="result-act">${result.act.title}</span>
                <span class="result-chapter">${result.chapter.title}</span>
            </div>
            <span class="result-match-type">${result.matchType}</span>
            </div>
            <div class="result-section">
            <h4>Section ${result.section.number}: ${result.section.title}</h4>
            <p class="result-content">${result.section.content}</p>
            <div class="result-match">
                <strong>Match:</strong> <span class="match-text">${result.matchText}</span>
            </div>
            <div class="result-keywords">
                <small><strong>Keywords:</strong> ${result.section.keywords.join(", ")}</small>
            </div>
            </div>
        `

        // Add click event to navigate to section
        resultItem.addEventListener("click", () => {
            navigateToSection(result.act.id, result.section.id)
        })

        resultsList.appendChild(resultItem)
        })

        searchResults.classList.remove("hidden")
    }

    function clearSearch() {
        searchInput.value = ""
        currentSearchResults = []
        searchResults.classList.add("hidden")
    }

    function searchForSection(sectionNumber, actId) {
        searchInput.value = sectionNumber
        actFilter.value = actId
        searchType.value = "section"
        performSearch()
    }

    function navigateToSection(actId, sectionId) {
        // Switch to the correct tab
        switchTab(actId)

        // Clear search to show full content
        clearSearch()

        // Find and highlight the section
        setTimeout(() => {
        const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`)
        if (sectionElement) {
            // Expand the chapter if it's collapsed
            const chapterContent = sectionElement.closest(".chapter-content")
            const chapterHeader = chapterContent.previousElementSibling

            if (!chapterContent.classList.contains("show")) {
            chapterHeader.click()
            }

            // Scroll to section and highlight
            setTimeout(() => {
            sectionElement.scrollIntoView({ behavior: "smooth", block: "center" })
            sectionElement.classList.add("highlighted")

            // Remove highlight after 3 seconds
            setTimeout(() => {
                sectionElement.classList.remove("highlighted")
            }, 3000)
            }, 300)
        }
        }, 100)
    }

    function switchTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active")
        })

        document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active")
        })

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add("active")
        document.getElementById(`${tabId}-tab`).classList.add("active")
    }
    })
