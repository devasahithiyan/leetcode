// ==================== Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ==================== Firebase Configuration (fill yours!) ====================
const firebaseConfig = { apiKey: "YOUR_API_KEY", authDomain: "leetocode-2a84c.firebaseapp.com", projectId: "leetocode-2a84c", storageBucket: "leetocode-2a84c.appspot.com", messagingSenderId: "855070686832", appId: "1:855070686832:web:eb875763462d3dfa99feb5", measurementId: "G-T887W9F6JL" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== DOM Elements ====================
const profileSelector = document.getElementById('profile');
const problemsList = document.getElementById('problems-list');
const totalSolvedElem = document.getElementById('total-solved');
const averageSolvedElem = document.getElementById('average-solved');
const overallProgressBar = document.getElementById('overall-progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const overallProgressNumbers = document.getElementById('overall-progress-numbers');

const detailedTotalSolvedElem = document.getElementById('detailed-total-solved');
const detailedAverageSolvedElem = document.getElementById('detailed-average-solved');

const solvesOverTimeChartCtx = document
  .getElementById('solves-over-time-chart')
  ?.getContext('2d');
const difficultyDistributionChartCtx = document
  .getElementById('difficulty-distribution-chart')
  ?.getContext('2d');
const topicWiseGrid = document.getElementById('topic-wise-grid');

const tabButtons = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
const loadingSpinner = document.getElementById('loading-spinner');
const syncButton = document.getElementById('sync-button');
const progressAnnouncer = document.getElementById('progress-announcer');

// Streak elements
const currentStreakElem = document.getElementById('current-streak');
const highestStreakElem = document.getElementById('highest-streak');

// Calendar container
const calendarContainer = document.getElementById('calendar-container');

// Modal references
const dayModal = document.getElementById('day-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalDateElem = document.getElementById('modal-date');
const problemsCountElem = document.getElementById('problems-count');
const problemsBody = document.getElementById('problems-body');

// ==================== State Variables ====================
let currentProfile = 'Sharvesh'; // default
let problemsData = {};       // from problems.json
let allSolvedDates = [];     // array of Date objects for all solves
let totalProblemsCount = 0;  // total in problems.json

// Chart references (destroy before re-create)
let averageSolvedChartRef = null;
let solvesOverTimeChartRef = null;
let difficultyDistributionChartRef = null;

// Topic stats
let topicSolvedCounts = {};
let topicDifficultyCounts = {};

// ==================== Profile-based Endpoints ====================
function getProfileEndpoint(profile) {
  switch (profile) {
    case 'Sandeep':
      return 'https://alfa-leetcode-api.onrender.com/sharveshml/acSubmission';
    case 'deva':
      return 'https://alfa-leetcode-api.onrender.com/devasahithiyan/acSubmission';
    case 'Sharvesh':
      return 'https://alfa-leetcode-api.onrender.com/sandeepkhannavp/acSubmission';
    
    default:
      return '';
  }
}

// ==================== Event Listeners ====================
profileSelector?.addEventListener('change', async () => {
  currentProfile = profileSelector.value;
  await loadProblems();
  await updateOverview();
  await updateDetailedAnalysis();
  renderCalendar();
});

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    tabContents.forEach(content => content.classList.remove('active'));
    const selectedTab = document.getElementById(button.dataset.tab);
    if (selectedTab) selectedTab.classList.add('active');
  });
});

syncButton?.addEventListener('click', () => {
  if (confirm('Synchronize your local problems with external API?')) {
    syncSubmittedProblems();
  }
});

// Modal close
closeModalBtn?.addEventListener('click', () => {
  dayModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === dayModal) {
    dayModal.style.display = 'none';
  }
});

// ==================== On DOM Load ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProblems();
  await updateOverview();
  await updateDetailedAnalysis();
  renderCalendar();
});

// ==================== Load Problems (from local JSON) ====================
async function loadProblems() {
  try {
    showLoading(true);
    const resp = await fetch('problems.json');
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    problemsData = await resp.json();

    countTotalProblems();
    await computeTopicStats();
    renderOverviewTopics();
  } catch (e) {
    console.error('Problem loading:', e);
    if (problemsList) {
      problemsList.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          Failed to load problems. Please try again later.
        </div>
      `;
    }
  } finally {
    showLoading(false);
  }
}

// ==================== Show/Hide Loading Spinner ====================
function showLoading(show) {
  if (!loadingSpinner) return;
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

// ==================== Count total problems from `problemsData` ====================
function countTotalProblems() {
  let count = 0;
  if (problemsData.topics && Array.isArray(problemsData.topics)) {
    problemsData.topics.forEach(t => {
      if (Array.isArray(t.problems)) count += t.problems.length;
    });
  }
  totalProblemsCount = count;
}

// ==================== Gather stats from Firestore (completed per topic/difficulty) ====================
async function computeTopicStats() {
  topicSolvedCounts = {};
  topicDifficultyCounts = {};

  if (!problemsData.topics) return;

  // Initialize counts
  problemsData.topics.forEach(topic => {
    topicSolvedCounts[topic.name] = 0;
    topicDifficultyCounts[topic.name] = { Easy: 0, Medium: 0, Hard: 0 };
  });

  const userRef = collection(db, 'users', currentProfile, 'problems');
  const q = query(userRef, where('completed', '==', true));
  const snap = await getDocs(q);

  snap.forEach(ds => {
    const data = ds.data();
    const tName = data.topic;
    if (tName && topicSolvedCounts[tName] !== undefined) {
      topicSolvedCounts[tName]++;
      if (data.difficulty && topicDifficultyCounts[tName][data.difficulty] !== undefined) {
        topicDifficultyCounts[tName][data.difficulty]++;
      }
    }
  });
}

// ==================== Render Topics in Overview (collapsible) ====================
function renderOverviewTopics() {
  if (!problemsData.topics || !Array.isArray(problemsData.topics)) {
    if (problemsList) {
      problemsList.innerHTML = '<p>No valid topics found.</p>';
    }
    return;
  }

  if (!problemsList) return;
  problemsList.innerHTML = ''; // Clear existing content

  problemsData.topics.forEach(topic => {
    const topicDiv = document.createElement('div');
    topicDiv.classList.add('topic');

    // Stats
    const total = Array.isArray(topic.problems) ? topic.problems.length : 0;
    const solved = topicSolvedCounts[topic.name] || 0;
    const pct = (total === 0) ? 0 : ((solved / total) * 100).toFixed(1);

    // Collapsible header
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('topic-header');

    // Topic name
    const h2 = document.createElement('h2');
    h2.textContent = topic.name;

    // Progress bar
    const progressWrapper = document.createElement('div');
    progressWrapper.classList.add('progress-wrapper');
    const subContainer = document.createElement('div');
    subContainer.classList.add('progress-bar-container');
    const subBar = document.createElement('div');
    subBar.classList.add('progress-bar-fill');
    subBar.style.width = `${pct}%`;
    subContainer.appendChild(subBar);

    const labelSpan = document.createElement('span');
    labelSpan.style.fontSize = '0.9em';
    labelSpan.textContent = `${pct}% | ${solved}/${total}`;
    progressWrapper.appendChild(subContainer);
    progressWrapper.appendChild(labelSpan);

    // Sort controls
    const sortControls = document.createElement('div');
    sortControls.classList.add('sort-controls');
    sortControls.innerHTML = `
      <select class="sort-select" aria-label="Sort problems by difficulty">
        <option value="default">Sort by</option>
        <option value="difficulty-asc">Difficulty (Easy First)</option>
        <option value="difficulty-desc">Difficulty (Hard First)</option>
      </select>
    `;

    headerDiv.appendChild(h2);
    headerDiv.appendChild(progressWrapper);
    headerDiv.appendChild(sortControls);

    const tableWrapper = document.createElement('div');
    tableWrapper.style.display = 'none';

    headerDiv.addEventListener('click', (e) => {
      // Prevent toggling if clicking directly on the SELECT
      if (e.target.closest('.sort-controls') || e.target.tagName === 'SELECT') return;
      tableWrapper.style.display = (tableWrapper.style.display === 'none') ? 'block' : 'none';
    });

    topicDiv.appendChild(headerDiv);

    // Build table
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    ['Completed', 'Title', 'Difficulty', 'Solved On', 'Notes'].forEach(hText => {
      const th = document.createElement('th');
      th.textContent = hText;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (Array.isArray(topic.problems)) {
      topic.problems.forEach(prob => {
        const row = document.createElement('tr');

        // Completed
        const cTd = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        cTd.appendChild(checkbox);
        row.appendChild(cTd);

        // Title
        const tTd = document.createElement('td');
        const link = document.createElement('a');
        link.href = prob.link;
        link.target = '_blank';
        link.textContent = prob.title;
        tTd.appendChild(link);
        row.appendChild(tTd);

        // Difficulty
        const dTd = document.createElement('td');
        dTd.textContent = prob.difficulty;
        const lower = prob.difficulty.toLowerCase();
        if (lower === 'easy') dTd.classList.add('difficulty-easy');
        if (lower === 'medium') dTd.classList.add('difficulty-medium');
        if (lower === 'hard') dTd.classList.add('difficulty-hard');
        row.appendChild(dTd);

        // Solved On
        const sTd = document.createElement('td');
        const sSpan = document.createElement('span');
        sSpan.textContent = 'N/A';
        sTd.appendChild(sSpan);
        row.appendChild(sTd);

        // Notes
        const nTd = document.createElement('td');
        const nInput = document.createElement('input');
        nInput.type = 'text';
        nInput.classList.add('notes-input');
        nInput.placeholder = 'Add notes...';
        nTd.appendChild(nInput);
        row.appendChild(nTd);

        // Firestore doc
        const docRef = doc(db, 'users', currentProfile, 'problems', prob.id.toString());
        getDoc(docRef).then(ds => {
          if (ds.exists()) {
            const data = ds.data();
            checkbox.checked = data.completed || false;
            if (data.notes) nInput.value = data.notes;
            if (data.solvedAt && data.solvedAt.toDate) {
              sSpan.textContent = data.solvedAt.toDate().toLocaleDateString();
            }
          }
        }).catch(e => console.error(`Error reading docRef for ${prob.title}:`, e));

        // Checkbox changes
        checkbox.addEventListener('change', async () => {
          try {
            if (checkbox.checked) {
              await setDoc(docRef, {
                completed: true,
                title: prob.title,
                link: prob.link,
                difficulty: prob.difficulty,
                topic: topic.name,
                solvedAt: Timestamp.fromDate(new Date())
              }, { merge: true });
              sSpan.textContent = new Date().toLocaleDateString();
            } else {
              await updateDoc(docRef, {
                completed: false,
                solvedAt: deleteField(),
                topic: deleteField()
              });
              sSpan.textContent = 'N/A';
            }
            // Recompute
            await computeTopicStats();
            updateTopicProgress(topic.name);
            renderTopicWiseDetailedAnalysis();
            await updateOverview();
            await updateDetailedAnalysis();
            renderCalendar();
          } catch (err) {
            console.error('Error:', err);
          }
        });

        // Notes (debounce)
        nInput.addEventListener('input', debounce(async () => {
          const val = nInput.value.trim();
          try {
            if (val) {
              await updateDoc(docRef, { notes: val });
            } else {
              await updateDoc(docRef, { notes: deleteField() });
            }
          } catch (er) {
            console.error('Error updating notes:', er);
          }
        }));

        tbody.appendChild(row);
      });
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    topicDiv.appendChild(tableWrapper);

    problemsList.appendChild(topicDiv);

    // Sorting
    sortControls.querySelector('select').addEventListener('change', (e) => {
      const sortOrder = e.target.value;
      const tableBody = tableWrapper.querySelector('tbody');
      const rows = Array.from(tableBody.querySelectorAll('tr'));

      rows.sort((a, b) => {
        const aDiff = a.querySelector('td:nth-child(3)').textContent;
        const bDiff = b.querySelector('td:nth-child(3)').textContent;
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };

        if (sortOrder === 'difficulty-asc') {
          return difficultyOrder[aDiff] - difficultyOrder[bDiff];
        }
        if (sortOrder === 'difficulty-desc') {
          return difficultyOrder[bDiff] - difficultyOrder[aDiff];
        }
        return 0;
      });

      tableBody.innerHTML = '';
      rows.forEach(row => tableBody.appendChild(row));
    });
  });
}

// Update progress bar for a given topic
function updateTopicProgress(topicName) {
  const topics = document.querySelectorAll('.topic');
  topics.forEach(topicDiv => {
    const header = topicDiv.querySelector('.topic-header h2');
    if (header.textContent === topicName) {
      const topicData = problemsData.topics.find(t => t.name === topicName);
      const total = topicData?.problems?.length || 0;
      const solved = topicSolvedCounts[topicName] || 0;
      const pct = total > 0 ? (solved / total * 100) : 0;

      const progressBar = topicDiv.querySelector('.progress-bar-fill');
      const progressText = topicDiv.querySelector('.progress-bar-container + span');

      progressBar.style.width = `${pct}%`;
      progressText.textContent = (`${pct.toFixed(1)}% | ${solved}/${total}`);
    }
  });
}

// ==================== Update Overview ====================
async function updateOverview() {
  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);
    const totalSolved = snap.size;
    if (totalSolvedElem) totalSolvedElem.textContent = totalSolved;

    // Collect all solved dates
    allSolvedDates = [];
    snap.forEach(ds => {
      const data = ds.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Average
    calculateAverageSolvedPerDay(totalSolved);
    renderAverageSolvedChart(totalSolved);

    // Overall progress
    const pct = Math.min((totalSolved / totalProblemsCount) * 100, 100);
    updateProgressBar(overallProgressBar, pct);
    if (overallProgressNumbers) {
      overallProgressNumbers.textContent = (`${totalSolved}/${totalProblemsCount}`);
    }
    if (progressPercentage) {
      progressPercentage.textContent = `${pct.toFixed(1)}%`;
      overallProgressBar?.setAttribute('aria-valuenow', pct.toFixed(1));
    }

    // Streaks
    const { currentStreak, highestStreak } = calculateStreaks(allSolvedDates);
    if (currentStreakElem) currentStreakElem.textContent = currentStreak;
    if (highestStreakElem) highestStreakElem.textContent = highestStreak;
  } catch (e) {
    console.error('Error in updateOverview:', e);
  }
}

function calculateAverageSolvedPerDay(totalSolved) {
  if (!allSolvedDates.length) {
    averageSolvedElem.textContent = '0';
    return;
  }
  const sorted = [...allSolvedDates].sort((a, b) => a - b);
  const firstDate = sorted[0];
  const days = Math.ceil((Date.now() - firstDate) / (1000 * 3600 * 24)) || 1;
  const avg = (totalSolved / days).toFixed(2);
  averageSolvedElem.textContent = avg;
}

function renderAverageSolvedChart(totalSolved) {
  const sorted = [...allSolvedDates].sort((a, b) => a - b);
  const firstDate = sorted[0] || new Date();
  const days = Math.ceil((Date.now() - firstDate) / (1000 * 3600 * 24)) || 1;
  const avg = (totalSolved / days).toFixed(2);
  const target = 10;
  const pct = Math.min((avg / target) * 100, 100);

  // destroy old instance if any
  if (averageSolvedChartRef) {
    averageSolvedChartRef.destroy();
    averageSolvedChartRef = null;
  }

  const ctx = document.getElementById('average-solved-chart');
  if (!ctx) return;

  averageSolvedChartRef = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Solved', 'Remaining'],
      datasets: [
        {
          data: [pct, 100 - pct],
          backgroundColor: ['#1abc9c', '#ecf0f1'],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      }
    }
  });
}

function updateProgressBar(barElement, percentage) {
  if (!barElement) return;
  progressAnnouncer.textContent = `Overall progress updated to ${percentage.toFixed(1)}%`;
  barElement.style.width = `${percentage.toFixed(1)}%`;
  barElement.style.transition = 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
}

// ==================== Streak Calculation ====================
function calculateStreaks(dates) {
  if (!dates.length) return { currentStreak: 0, highestStreak: 0 };
  const sorted = [...dates].map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate())).sort((a, b) => a - b);

  let currentStreak = 1;
  let highestStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diffDays = Math.round((curr - prev) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > highestStreak) highestStreak = currentStreak;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  return { currentStreak, highestStreak };
}

// ==================== Update Detailed Analysis ====================
async function updateDetailedAnalysis() {
  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);
    const totalSolved = snap.size;
    if (detailedTotalSolvedElem) detailedTotalSolvedElem.textContent = totalSolved;

    // Rebuild allSolvedDates
    allSolvedDates = [];
    snap.forEach(ds => {
      const data = ds.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Reuse average from overview
    calculateAverageSolvedPerDay(totalSolved);
    if (detailedAverageSolvedElem) {
      detailedAverageSolvedElem.textContent = averageSolvedElem?.textContent || '0';
    }

    // Charts
    renderSolvesOverTimeChart();
    renderDifficultyDistributionChart();

    await computeTopicStats();
    renderTopicWiseDetailedAnalysis();
  } catch (e) {
    console.error('Error updateDetailedAnalysis:', e);
  }
}

function renderSolvesOverTimeChart() {
  if (solvesOverTimeChartRef) {
    solvesOverTimeChartRef.destroy();
    solvesOverTimeChartRef = null;
  }
  if (!solvesOverTimeChartCtx) return;

  const solveCounts = {};
  allSolvedDates.forEach(date => {
    const day = date.toISOString().split('T')[0];
    solveCounts[day] = (solveCounts[day] || 0) + 1;
  });
  const sortedDays = Object.keys(solveCounts).sort();
  const data = sortedDays.map(day => solveCounts[day]);

  solvesOverTimeChartRef = new Chart(solvesOverTimeChartCtx, {
    type: 'line',
    data: {
      labels: sortedDays,
      datasets: [
        {
          label: 'Problems Solved',
          data: data,
          borderColor: '#1abc9c',
          backgroundColor: 'rgba(26,188,156,0.2)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#1abc9c'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Date' },
          ticks: { maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          title: { display: true, text: 'Problems Solved' },
          beginAtZero: true,
          precision: 0,
          grid: { color: '#f0f0f0' }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1abc9c',
          titleColor: '#fff',
          bodyColor: '#fff'
        }
      }
    }
  });
}

async function renderDifficultyDistributionChart() {
  if (difficultyDistributionChartRef) {
    difficultyDistributionChartRef.destroy();
    difficultyDistributionChartRef = null;
  }
  if (!difficultyDistributionChartCtx) return;

  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);

    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
    snap.forEach(ds => {
      const data = ds.data();
      if (data.difficulty && difficultyCounts[data.difficulty] !== undefined) {
        difficultyCounts[data.difficulty]++;
      }
    });

    const labels = Object.keys(difficultyCounts);
    const chartData = Object.values(difficultyCounts);

    difficultyDistributionChartRef = new Chart(difficultyDistributionChartCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: chartData,
            backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            backgroundColor: '#34495e',
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    });
  } catch (e) {
    console.error('Error in difficulty distribution chart:', e);
  }
}

// ==================== Topic-Wise Detailed Analysis ====================
function renderTopicWiseDetailedAnalysis() {
  if (!problemsData.topics || !topicWiseGrid) return;
  topicWiseGrid.innerHTML = ''; // Clear existing

  problemsData.topics.forEach(topic => {
    const total = Array.isArray(topic.problems) ? topic.problems.length : 0;
    const solved = topicSolvedCounts[topic.name] || 0;
    const mainPct = (total === 0) ? 0 : ((solved / total) * 100).toFixed(1);

    const diffObj = topicDifficultyCounts[topic.name] || {
      Easy: 0,
      Medium: 0,
      Hard: 0
    };
    const eCount = diffObj.Easy;
    const mCount = diffObj.Medium;
    const hCount = diffObj.Hard;

    // Card
    const card = document.createElement('div');
    card.classList.add('accordion-card');

    // Header
    const accordionHeader = document.createElement('div');
    accordionHeader.classList.add('accordion-header');

    const heading = document.createElement('h3');
    heading.textContent = topic.name;
    accordionHeader.appendChild(heading);

    const progressInfo = document.createElement('div');
    progressInfo.classList.add('topic-progress-info');
    progressInfo.innerHTML = `<span>${mainPct}% Completed</span>`;
    accordionHeader.appendChild(progressInfo);

    // Body
    const accordionBody = document.createElement('div');
    accordionBody.classList.add('accordion-body');

    const extraStats = document.createElement('div');
    extraStats.classList.add('topic-extra-stats');
    const longestStreak = document.createElement('div');
    longestStreak.classList.add('stat-box');
    longestStreak.innerHTML = `<strong>Longest Streak:</strong> 0 Days`; 
    const timeSpent = document.createElement('div');
    timeSpent.classList.add('stat-box');
    timeSpent.innerHTML = `<strong>Time Spent:</strong> 0 Hours`; 
    extraStats.appendChild(longestStreak);
    extraStats.appendChild(timeSpent);

    accordionBody.appendChild(extraStats);

    // Pie chart for that topic
    const chartDiv = document.createElement('div');
    chartDiv.classList.add('topic-chart');
    const canvas = document.createElement('canvas');
    canvas.id = `topic-chart-${topic.name.replace(/\s+/g, '-')}`;
    chartDiv.appendChild(canvas);
    accordionBody.appendChild(chartDiv);

    card.appendChild(accordionHeader);
    card.appendChild(accordionBody);
    topicWiseGrid.appendChild(card);

    // Render small pie
    new Chart(canvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [
          {
            data: [eCount, mCount, hCount],
            backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // Toggle
    accordionHeader.addEventListener('click', () => {
      accordionBody.classList.toggle('open');
    });
  });
}

// ==================== Sync with External API ====================
async function syncSubmittedProblems() {
  if (loadingSpinner?.style.display === 'flex') {
    alert('Synchronization is already in progress. Please wait.');
    return;
  }
  showLoading(true);

  try {
    const url = getProfileEndpoint(currentProfile);
    if (!url) {
      alert('No API endpoint found for this profile!');
      return;
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API request failed, status ${resp.status}`);

    const data = await resp.json();
    if (!data || !Array.isArray(data.submission)) {
      alert('API data unexpected or no "submission" array found.');
      return;
    }

    const submittedTitles = data.submission.map(i => i.title).filter(Boolean);
    if (!submittedTitles.length) {
      alert('No matching submissions found or empty data from API.');
      return;
    }

    const matched = matchProblems(submittedTitles, problemsData);
    if (!matched.length) {
      alert('No matching problems found between local data and external API.');
      return;
    }

    await updateFirebaseForMatchedProblems(matched);

    // Reload
    await loadProblems();
    await updateOverview();
    await updateDetailedAnalysis();
    renderCalendar();

    alert('Synchronization complete! Marked new problems as completed.');
  } catch (e) {
    console.error('Sync error:', e);
    alert(`Sync error: ${e.message}`);
  } finally {
    showLoading(false);
  }
}

function matchProblems(submittedTitles, localData) {
  const normalized = submittedTitles.map(t =>
    t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  );

  return localData.topics.flatMap(topic =>
    topic.problems.filter(prob => {
      const cleanTitle = prob.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return normalized.includes(cleanTitle);
    }).map(prob => ({
      topic: topic.name,
      problemId: prob.id.toString(),
      title: prob.title,
      link: prob.link,
      difficulty: prob.difficulty
    }))
  );
}

async function updateFirebaseForMatchedProblems(matchedProblems) {
  const tasks = matchedProblems.map(async prob => {
    const docRef = doc(db, 'users', currentProfile, 'problems', prob.problemId);
    try {
      const ds = await getDoc(docRef);
      if (ds.exists()) {
        const data = ds.data();
        if (!data.completed) {
          await updateDoc(docRef, {
            completed: true,
            solvedAt: Timestamp.fromDate(new Date()),
            topic: prob.topic
          });
        }
      } else {
        await setDoc(docRef, {
          completed: true,
          title: prob.title,
          link: prob.link,
          difficulty: prob.difficulty,
          topic: prob.topic,
          solvedAt: Timestamp.fromDate(new Date())
        });
      }
    } catch (e) {
      console.error(`Error updating problem "${prob.title}":`, e);
    }
  });
  await Promise.all(tasks);
}

// ==================== Debounce Function ====================
function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

// ==================== Calendar & Modal ==================== */
/**
 * getAllCompletedProblems -> array of { date:Date, title:string, difficulty:string }
 */
async function getAllCompletedProblems() {
  const result = [];
  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        result.push({
          date: data.solvedAt.toDate(),
          title: data.title || 'Untitled',
          difficulty: data.difficulty || 'Unknown'
        });
      }
    });
  } catch (err) {
    console.error('Error in getAllCompletedProblems:', err);
  }
  return result;
}

/** openDayModal(isoStr, dayData) => dayData = { count, problems: [{title, difficulty}, ...] } */
function openDayModal(isoStr, dayData) {
  if (!dayModal) return;
  dayModal.style.display = 'block';
  modalDateElem.textContent = isoStr;
  problemsCountElem.textContent = `Total Problems Solved: ${dayData.count}`;

  problemsBody.innerHTML = '';
  dayData.problems.forEach((prob) => {
    const tr = document.createElement('tr');
    
    // Problem Title
    const tdTitle = document.createElement('td');
    tdTitle.textContent = prob.title;
    
    // Difficulty
    const tdDiff = document.createElement('td');
    tdDiff.textContent = prob.difficulty;
    
    // Add difficulty-based class
    const diffLower = prob.difficulty.toLowerCase();
    if (diffLower === 'easy') tdDiff.classList.add('difficulty-easy');
    if (diffLower === 'medium') tdDiff.classList.add('difficulty-medium');
    if (diffLower === 'hard') tdDiff.classList.add('difficulty-hard');
    
    tr.appendChild(tdTitle);
    tr.appendChild(tdDiff);
    problemsBody.appendChild(tr);
  });
}

/**
 * getMonthlySolvedCount(solveMap, year, month) => total solves in the specified month
 */
function getMonthlySolvedCount(solveMap, year, month) {
  let total = 0;
  const days = Object.keys(solveMap);
  days.forEach(dayStr => {
    const dObj = new Date(dayStr);
    if (dObj.getFullYear() === year && dObj.getMonth() === month) {
      total += solveMap[dayStr].count;
    }
  });
  return total;
}

/** Main calendar function */
function renderCalendar(year, month) {
  if (!calendarContainer) return;

  // default to current year/month if none
  const now = new Date();
  const currYear = year ?? now.getFullYear();
  const currMonth = (month ?? now.getMonth());

  // Clear
  calendarContainer.innerHTML = '';

  // header
  const headerDiv = document.createElement('div');
  headerDiv.classList.add('calendar-header');

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.addEventListener('click', () => {
    let newMonth = currMonth - 1;
    let newYear = currYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    renderCalendar(newYear, newMonth);
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.addEventListener('click', () => {
    let newMonth = currMonth + 1;
    let newYear = currYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    renderCalendar(newYear, newMonth);
  });

  // month info
  const monthInfo = document.createElement('div');
  monthInfo.classList.add('month-info');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthYearTitle = document.createElement('h3');
  monthYearTitle.style.margin = '0';
  monthYearTitle.textContent = `${monthNames[currMonth]} ${currYear}`;

  // badge for month total
  const monthBadge = document.createElement('span');
  monthBadge.classList.add('month-solved-badge');
  monthBadge.textContent = `Month Solved: 0`; // fill later

  monthInfo.appendChild(monthYearTitle);
  monthInfo.appendChild(monthBadge);

  headerDiv.appendChild(prevBtn);
  headerDiv.appendChild(monthInfo);
  headerDiv.appendChild(nextBtn);

  calendarContainer.appendChild(headerDiv);

  // fill days
  getAllCompletedProblems()
    .then(allCompleted => {
      // build solveMap
      const solveMap = {};
      allCompleted.forEach(item => {
        const dayStr = item.date.toISOString().split('T')[0];
        if (!solveMap[dayStr]) {
          solveMap[dayStr] = { count: 0, problems: [] };
        }
        solveMap[dayStr].count++;
        solveMap[dayStr].problems.push({
          title: item.title,
          difficulty: item.difficulty
        });
      });

      // fill month-solved
      const monthSolved = getMonthlySolvedCount(solveMap, currYear, currMonth);
      monthBadge.textContent = `Solved this Month: ${monthSolved}`;

      // day names
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const grid = document.createElement('div');
      grid.classList.add('calendar-grid');

      dayNames.forEach(d => {
        const dh = document.createElement('div');
        dh.classList.add('day-header');
        dh.textContent = d;
        grid.appendChild(dh);
      });

      // compute days
      const firstDayOfMonth = new Date(currYear, currMonth, 1);
      const lastDayOfMonth = new Date(currYear, currMonth + 1, 0);
      const startDay = firstDayOfMonth.getDay();
      const totalDays = lastDayOfMonth.getDate();

      // blank
      for (let i = 0; i < startDay; i++) {
        const blank = document.createElement('div');
        blank.classList.add('calendar-day', 'inactive');
        grid.appendChild(blank);
      }

      // fill
      for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = day;

        const dateObj = new Date(currYear, currMonth, day);
        const isoStr = dateObj.toISOString().split('T')[0];

        if (solveMap[isoStr]) {
          const sc = document.createElement('div');
          sc.classList.add('solves-count');
          sc.textContent = solveMap[isoStr].count;
          dayDiv.appendChild(sc);

          // click -> open modal
          dayDiv.addEventListener('click', () => {
            openDayModal(isoStr, solveMap[isoStr]);
          });
        } else {
          dayDiv.addEventListener('click', () => {
            openDayModal(isoStr, { count: 0, problems: [] });
          });
        }
        grid.appendChild(dayDiv);
      }

      calendarContainer.appendChild(grid);
    })
    .catch(err => console.error('Error building solve map:', err));
}
