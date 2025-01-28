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

// ==================== Firebase Configuration ====================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "leetocode-2a84c.firebaseapp.com",
  projectId: "leetocode-2a84c",
  storageBucket: "leetocode-2a84c.appspot.com",
  messagingSenderId: "855070686832",
  appId: "1:855070686832:web:eb875763462d3dfa99feb5",
  measurementId: "G-T887W9F6JL"
};

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

const solvesOverTimeChartCtx = document.getElementById('solves-over-time-chart').getContext('2d');
const difficultyDistributionChartCtx = document.getElementById('difficulty-distribution-chart').getContext('2d');
const topicWiseGrid = document.getElementById('topic-wise-grid');

const tabButtons = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
const loadingSpinner = document.getElementById('loading-spinner');
const syncButton = document.getElementById('sync-button');
const progressAnnouncer = document.getElementById('progress-announcer');

// ==================== State Variables ====================
let currentProfile = 'sharvesh';
let problemsData = {};
let allSolvedDates = [];
let totalProblemsCount = 0;

// Chart references
let averageSolvedChartRef = null;
let solvesOverTimeChartRef = null;
let difficultyDistributionChartRef = null;

// Topic stats
let topicSolvedCounts = {};
let topicDifficultyCounts = {};

// ==================== Profile-based Endpoints ====================
function getProfileEndpoint(profile) {
  switch (profile) {
    case 'sandeep':
      return 'https://alfa-leetcode-api.onrender.com/sandeepkhannavp/acSubmission';
    case 'deva':
      return 'https://alfa-leetcode-api.onrender.com/devasahithiyan/acSubmission';
    case 'sharvesh':
    default:
      return 'https://alfa-leetcode-api.onrender.com/sharveshml/acSubmission';
  }
}

// ==================== Event Listeners ====================
profileSelector.addEventListener('change', async () => {
  currentProfile = profileSelector.value;
  await loadProblems();
  await updateOverview();
  await updateDetailedAnalysis();
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

// ==================== Initial Load ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProblems();
  await updateOverview();
  await updateDetailedAnalysis();
});

// ==================== Load Problems ====================
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
    problemsList.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        Failed to load problems. Please try again later.
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

// ==================== Utility Function to Show/Hide Loading Spinner ====================
function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

// ==================== Count total problems ====================
function countTotalProblems() {
  let count = 0;
  if (problemsData.topics && Array.isArray(problemsData.topics)) {
    problemsData.topics.forEach(t => {
      if (Array.isArray(t.problems)) count += t.problems.length;
    });
  }
  totalProblemsCount = count;
}

// ==================== Gather stats from Firestore: completed per topic & difficulty ====================
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

// ==================== Render Collapsible Topics in Overview ====================
function renderOverviewTopics() {
  if (!problemsData.topics || !Array.isArray(problemsData.topics)) {
    problemsList.innerHTML = '<p>No valid topics found.</p>';
    return;
  }

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

    const h2 = document.createElement('h2');
    h2.textContent = topic.name;

    // Progress bar container
    const subContainer = document.createElement('div');
    subContainer.classList.add('progress-bar-container');

    const subBar = document.createElement('div');
    subBar.classList.add('progress-bar', 'progress-bar-fill');
    subBar.style.width = `${pct}%`;

    subContainer.appendChild(subBar);

    const labelSpan = document.createElement('span');
    labelSpan.style.fontSize = '0.9em';
    labelSpan.textContent = `(${pct}% | ${solved}/${total})`;
    labelSpan.style.marginLeft = '5px';

    headerDiv.appendChild(h2);
    headerDiv.appendChild(subContainer);
    headerDiv.appendChild(labelSpan);

    // ==================== Add Sort Controls ====================
    const sortControls = document.createElement('div');
    sortControls.classList.add('sort-controls');
    sortControls.innerHTML = `
      <select class="sort-select" aria-label="Sort problems by difficulty">
        <option value="default">Sort by</option>
        <option value="difficulty-asc">Difficulty (Easy First)</option>
        <option value="difficulty-desc">Difficulty (Hard First)</option>
      </select>
    `;
    headerDiv.appendChild(sortControls);

    // Table wrapper
    const tableWrapper = document.createElement('div');
    tableWrapper.style.display = 'none';

    headerDiv.addEventListener('click', (e) => {
      // Prevent toggle when interacting with sort controls
      if (e.target.closest('.sort-controls')) return;
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
        if (prob.difficulty.toLowerCase() === 'easy') dTd.classList.add('difficulty-easy');
        if (prob.difficulty.toLowerCase() === 'medium') dTd.classList.add('difficulty-medium');
        if (prob.difficulty.toLowerCase() === 'hard') dTd.classList.add('difficulty-hard');
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

        // Checkbox Event Listener
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
            // Force immediate UI update
            await computeTopicStats();
            updateTopicProgress(topic.name);
            renderTopicWiseDetailedAnalysis();
            await updateOverview(); // Added line
            await updateDetailedAnalysis();
          } catch (err) {
            console.error('Error:', err);
          }
        });

        // Notes Event Listener with Debounce
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

    // ==================== Add Event Listener for Sorting ====================
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

// ==================== Update Overview ====================
async function updateOverview() {
  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);
    const totalSolved = snap.size;
    totalSolvedElem.textContent = totalSolved;

    allSolvedDates = [];
    snap.forEach(ds => {
      const data = ds.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Calculate and display average
    calculateAverageSolvedPerDay(totalSolved);
    renderAverageSolvedChart(totalSolved);

    // Update overall progress
    const pct = Math.min((totalSolved / totalProblemsCount) * 100, 100); // Updated line
    updateProgressBar(overallProgressBar, pct);
    overallProgressNumbers.textContent = `(${totalSolved}/${totalProblemsCount})`;
    progressPercentage.textContent = `${pct.toFixed(1)}%`;
    overallProgressBar.setAttribute('aria-valuenow', pct.toFixed(1));
  } catch (e) {
    console.error('Error in updateOverview:', e);
  }
}

// ==================== Calculate Average Solved Per Day ====================
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

// ==================== Render Doughnut for Average Solved ====================
function renderAverageSolvedChart(totalSolved) {
  const sorted = [...allSolvedDates].sort((a, b) => a - b);
  const firstDate = sorted[0] || new Date();
  const days = Math.ceil((Date.now() - firstDate) / (1000 * 3600 * 24)) || 1;
  const avg = (totalSolved / days).toFixed(2);
  const target = 10;
  const pct = Math.min((avg / target) * 100, 100);

  if (averageSolvedChartRef) averageSolvedChartRef.destroy();

  averageSolvedChartRef = new Chart(document.getElementById('average-solved-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Solved', 'Remaining'],
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: ['#1abc9c', '#ecf0f1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, /* Added line */
      maintainAspectRatio: false, /* Added line */
      cutout: '70%',
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        beforeDraw: function (chart) {
          const { ctx, width, height } = chart;
          ctx.restore();
          const fs = (height / 160).toFixed(2);
          ctx.font = `${fs}em Inter`; /* Updated font */
          ctx.textBaseline = 'middle';
          const text = avg;
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2;
          ctx.fillStyle = '#34495e';
          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }
    }
  });
}

// ==================== Update Progress Bar Utility ====================
function updateProgressBar(barElement, percentage) {
  progressAnnouncer.textContent = `Overall progress updated to ${percentage.toFixed(1)}%`; /* Added line */
  barElement.style.width = `${percentage.toFixed(1)}%`;
  barElement.style.transition = 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'; /* Updated transition */
}

/* ==================== Update Topic Progress ==================== */
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
      progressText.textContent = `(${pct.toFixed(1)}% | ${solved}/${total})`;
    }
  });
}

// ==================== Update Detailed Analysis ====================
async function updateDetailedAnalysis() {
  try {
    const userRef = collection(db, 'users', currentProfile, 'problems');
    const q = query(userRef, where('completed', '==', true));
    const snap = await getDocs(q);
    const totalSolved = snap.size;
    detailedTotalSolvedElem.textContent = totalSolved;

    allSolvedDates = [];
    snap.forEach(ds => {
      const data = ds.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Calculate and display average
    calculateAverageSolvedPerDay(totalSolved);
    detailedAverageSolvedElem.textContent = averageSolvedElem.textContent;

    renderSolvesOverTimeChart();
    renderDifficultyDistributionChart();

    // Re-gather stats for the advanced topic analysis
    await computeTopicStats();
    renderTopicWiseDetailedAnalysis();

  } catch (e) {
    console.error('Error updateDetailedAnalysis:', e);
  }
}

// ==================== Render Solves Over Time (line) ====================
function renderSolvesOverTimeChart() {
  if (solvesOverTimeChartRef) {
    solvesOverTimeChartRef.destroy();
    solvesOverTimeChartRef = null;
  }

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
      datasets: [{
        label: 'Problems Solved',
        data: data,
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26,188,156,0.2)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1abc9c'
      }]
    },
    options: {
      responsive: true, /* Added line */
      maintainAspectRatio: false, /* Added line */
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
          display: false,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 20
          }
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

// ==================== Render Difficulty Distribution (pie) ====================
async function renderDifficultyDistributionChart() {
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

    if (difficultyDistributionChartRef) difficultyDistributionChartRef.destroy();

    difficultyDistributionChartRef = new Chart(difficultyDistributionChartCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: chartData,
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
        }]
      },
      options: {
        responsive: true, /* Added line */
        maintainAspectRatio: false, /* Added line */
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 20
            }
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

// ==================== Render Topic-Wise Detailed Analysis (grid of cards) ====================
function renderTopicWiseDetailedAnalysis() {
  if (!problemsData.topics) return;

  topicWiseGrid.innerHTML = ''; // Clear existing content

  problemsData.topics.forEach(topic => {
    // Total problems
    const total = Array.isArray(topic.problems) ? topic.problems.length : 0;
    const solved = topicSolvedCounts[topic.name] || 0;
    const mainPct = (total === 0) ? 0 : ((solved / total) * 100).toFixed(1);

    // Difficulty counts
    const diffObj = topicDifficultyCounts[topic.name] || { Easy: 0, Medium: 0, Hard: 0 };
    const eCount = diffObj.Easy;
    const mCount = diffObj.Medium;
    const hCount = diffObj.Hard;

    // Total easy/med/hard for that topic
    let totalEasy = 0, totalMed = 0, totalHard = 0;
    if (Array.isArray(topic.problems)) {
      topic.problems.forEach(prob => {
        if (prob.difficulty.toLowerCase() === 'easy') totalEasy++;
        else if (prob.difficulty.toLowerCase() === 'medium') totalMed++;
        else if (prob.difficulty.toLowerCase() === 'hard') totalHard++;
      });
    }

    // Build a card
    const card = document.createElement('div');
    card.classList.add('topic-wise-card');

    // Title
    const heading = document.createElement('h3');
    heading.textContent = topic.name;
    card.appendChild(heading);

    // Stats Row
    const statsRow = document.createElement('div');
    statsRow.classList.add('stats-row');

    const stat1 = document.createElement('div');
    stat1.classList.add('stat-item');
    stat1.innerHTML = `<strong>Completed:</strong> ${solved} / ${total} (${mainPct}%)`;
    statsRow.appendChild(stat1);

    const stat2 = document.createElement('div');
    stat2.classList.add('stat-item');
    stat2.innerHTML = `<strong>Easy:</strong> ${eCount} / ${totalEasy}`;
    statsRow.appendChild(stat2);

    const stat3 = document.createElement('div');
    stat3.classList.add('stat-item');
    stat3.innerHTML = `<strong>Medium:</strong> ${mCount} / ${totalMed}`;
    statsRow.appendChild(stat3);

    const stat4 = document.createElement('div');
    stat4.classList.add('stat-item');
    stat4.innerHTML = `<strong>Hard:</strong> ${hCount} / ${totalHard}`;
    statsRow.appendChild(stat4);

    card.appendChild(statsRow);

    // Progress Text
    const progressLine = document.createElement('p');
    progressLine.classList.add('progress-text');
    progressLine.textContent = `Progress: ${mainPct}%`;
    card.appendChild(progressLine);

    // Chart Container
    const chartDiv = document.createElement('div');
    chartDiv.classList.add('topic-chart');
    const canvas = document.createElement('canvas');
    canvas.id = `topic-chart-${topic.name.replace(/\s+/g, '-')}`;
    chartDiv.appendChild(canvas);
    card.appendChild(chartDiv);

    topicWiseGrid.appendChild(card);

    // Render a small pie chart for eCount, mCount, hCount
    new Chart(canvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [{
          data: [eCount, mCount, hCount],
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
        }]
      },
      options: {
        responsive: true, /* Added line */
        maintainAspectRatio: false, /* Added line */
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#34495e',
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    });
  });
}

// ==================== Sync with external API ====================
async function syncSubmittedProblems() {
  if (loadingSpinner.style.display === 'flex') {
    alert('Synchronization is already in progress. Please wait.');
    return;
  }
  showLoading(true);

  try {
    const url = getProfileEndpoint(currentProfile);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API request failed, status ${resp.status}`);

    const data = await resp.json();
    if (!data || !Array.isArray(data.submission)) {
      alert('API data unexpected or no submission array found.');
      return;
    }

    const submittedTitles = data.submission.map(i => i.title).filter(Boolean);
    if (!submittedTitles.length) {
      alert('No matching submissions found or empty data from API.');
      return;
    }

    const matched = matchProblems(submittedTitles, problemsData);
    if (!matched.length) {
      alert('No matching problems found between your data and the external API.');
      return;
    }

    await updateFirebaseForMatchedProblems(matched);

    // Reload everything
    await loadProblems();
    await updateOverview();
    await updateDetailedAnalysis();

    alert('Synchronization complete! Marked new problems as completed.');
  } catch (e) {
    console.error('Sync error:', e);
    alert(`Sync error: ${e.message}`);
  } finally {
    showLoading(false);
  }
}

function matchProblems(submittedTitles, localData) {
  // Improved normalization
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

// ==================== Sync Button ====================
if (syncButton) {
  syncButton.addEventListener('click', () => {
    if (confirm('Synchronize your local problems with external API?')) {
      syncSubmittedProblems();
    }
  });
}

// ==================== Debounce Function ====================
function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}
