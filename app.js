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
  apiKey: "AIzaSyC0Qgq0EJSQnC2LVpdyuISzs4uDG21hsy8",
  authDomain: "leetocode-2a84c.firebaseapp.com",
  projectId: "leetocode-2a84c",
  storageBucket: "leetocode-2a84c.appspot.com",
  messagingSenderId: "855070686832",
  appId: "1:855070686832:web:eb875763462d3dfa99feb5",
  measurementId: "G-T887W9F6JL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== DOM Elements ====================
const profileSelector = document.getElementById('profile');
const problemsList = document.getElementById('problems-list');
const totalSolvedElem = document.getElementById('total-solved');
const averageSolvedElem = document.getElementById('average-solved');
const overallProgressBar = document.getElementById('overall-progress-bar');
const progressPercentage = document.getElementById('progress-percentage');

// Detailed Analysis Elements
const detailedTotalSolvedElem = document.getElementById('detailed-total-solved');
const detailedAverageSolvedElem = document.getElementById('detailed-average-solved');
const topicProgressContainer = document.getElementById('topic-progress-container');
const solvesOverTimeChartCtx = document.getElementById('solves-over-time-chart').getContext('2d');
const difficultyDistributionChartCtx = document.getElementById('difficulty-distribution-chart').getContext('2d');

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// ==================== State Variables ====================
let currentProfile = 'sharvesh';
let problemsData = {};
let allSolvedDates = [];
let topicWiseSolved = {};
let totalProblemsCount = 0;

// ==================== Event Listeners ====================

// Handle profile change
profileSelector.addEventListener('change', (e) => {
  currentProfile = e.target.value;
  loadProblems();
  updateOverview();
  updateDetailedAnalysis();
});

// Handle tab switching
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    // Add active class to the clicked button
    button.classList.add('active');

    // Hide all tab contents
    tabContents.forEach(content => content.classList.remove('active'));
    // Show the selected tab content
    const selectedTab = document.getElementById(button.dataset.tab);
    selectedTab.classList.add('active');
  });
});

// ==================== Load Problems ====================
async function loadProblems() {
  problemsList.innerHTML = ''; // Clear existing problems
  totalProblemsCount = 0; // Reset total problems count

  try {
    const response = await fetch('problems.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    problemsData = await response.json();
    console.log('Fetched problemsData:', problemsData); // Debugging Line
    countTotalProblems();
    renderProblems();
    updateOverview();
    clearDetailedAnalysis();
  } catch (error) {
    console.error('Error loading problems:', error);
    problemsList.innerHTML = `<p>Error loading problems. Please try again later.</p>`;
  }
}

// ==================== Count total number of problems ====================
function countTotalProblems() {
  let count = 0;
  if (problemsData.topics && Array.isArray(problemsData.topics)) {
    problemsData.topics.forEach(topic => {
      if (topic.problems && Array.isArray(topic.problems)) {
        count += topic.problems.length;
      }
    });
  }
  totalProblemsCount = count;
  console.log(`Total Problems Count: ${totalProblemsCount}`);
}

// ==================== Render problems to the DOM ====================
function renderProblems() {
  if (!problemsData.topics || !Array.isArray(problemsData.topics)) {
    console.error("Invalid problemsData structure:", problemsData);
    problemsList.innerHTML = `<p>Invalid problems data structure.</p>`;
    return;
  }

  problemsData.topics.forEach(topic => {
    // Create topic container
    const topicDiv = document.createElement('div');
    topicDiv.classList.add('topic');

    // Topic header
    const topicHeader = document.createElement('h2');
    topicHeader.textContent = topic.name;
    topicDiv.appendChild(topicHeader);

    // Create table
    const table = document.createElement('table');

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Completed', 'Title', 'Difficulty', 'Solved On', 'Notes', 'Link'];

    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    topic.problems.forEach(problem => {
      const row = document.createElement('tr');

      // Completed Checkbox
      const completedCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `problem-${problem.id}`;
      completedCell.appendChild(checkbox);
      row.appendChild(completedCell);

      // Title
      const titleCell = document.createElement('td');
      const titleLabel = document.createElement('label');
      titleLabel.htmlFor = `problem-${problem.id}`;
      titleLabel.textContent = problem.title;
      titleCell.appendChild(titleLabel);
      row.appendChild(titleCell);

      // Difficulty
      const difficultyCell = document.createElement('td');
      difficultyCell.textContent = problem.difficulty;
      row.appendChild(difficultyCell);

      // Solved On
      const solvedOnCell = document.createElement('td');
      const solvedOnSpan = document.createElement('span');
      solvedOnSpan.id = `solved-on-${problem.id}`;
      solvedOnSpan.textContent = 'N/A';
      solvedOnCell.appendChild(solvedOnSpan);
      row.appendChild(solvedOnCell);

      // Notes
      const notesCell = document.createElement('td');
      const notesInput = document.createElement('input');
      notesInput.type = 'text';
      notesInput.classList.add('notes-input');
      notesInput.placeholder = 'Add notes...';
      notesInput.dataset.problemId = problem.id;
      notesCell.appendChild(notesInput);
      row.appendChild(notesCell);

      // Link
      const linkCell = document.createElement('td');
      const linkIcon = document.createElement('a');
      linkIcon.href = problem.link;
      linkIcon.target = '_blank';
      linkIcon.title = 'Go to Problem';
      linkIcon.innerHTML = '🔗';
      linkCell.appendChild(linkIcon);
      row.appendChild(linkCell);

      // Append row to tbody
      tbody.appendChild(row);

      // Fetch and set checkbox status, notes, and solvedOn from Firebase
      const docRef = doc(db, 'users', currentProfile, 'problems', problem.id.toString());
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          checkbox.checked = data.completed || false;
          if (data.notes) {
            notesInput.value = data.notes;
          }
          if (data.solvedAt && data.solvedAt.toDate) {
            const solvedDate = data.solvedAt.toDate();
            solvedOnSpan.textContent = solvedDate.toLocaleDateString();
          }
        }
      }).catch(error => {
        console.error(`Error fetching data for problem ${problem.id}: `, error);
      });

      // Handle checkbox change
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          // Mark as completed with timestamp and topic
          setDoc(docRef, {
            completed: true,
            title: problem.title,
            link: problem.link,
            difficulty: problem.difficulty,
            topic: topic.name, // Save the topic
            solvedAt: Timestamp.fromDate(new Date())
          }, { merge: true })
            .then(() => {
              console.log(`Problem ID ${problem.id} marked as completed.`);
              // Update Solved On Date
              const now = new Date();
              solvedOnSpan.textContent = now.toLocaleDateString();
              // Update analysis
              updateOverview();
              updateDetailedAnalysis();
            })
            .catch(error => {
              console.error("Error updating document: ", error);
            });
        } else {
          // Mark as not completed and remove timestamp and topic
          updateDoc(docRef, {
            completed: false,
            solvedAt: deleteField(),
            topic: deleteField()
          })
            .then(() => {
              console.log(`Problem ID ${problem.id} marked as not completed.`);
              // Update Solved On Date
              solvedOnSpan.textContent = 'N/A';
              // Update analysis
              updateOverview();
              updateDetailedAnalysis();
            })
            .catch(error => {
              console.error("Error updating document: ", error);
            });
        }
      });

      // Handle notes input
      notesInput.addEventListener('input', () => {
        const notes = notesInput.value.trim();
        if (notes) {
          updateDoc(docRef, {
            notes: notes
          })
            .then(() => {
              console.log(`Notes updated for problem ID ${problem.id}.`);
            })
            .catch(error => {
              console.error("Error updating notes: ", error);
            });
        } else {
          // If notes are empty, remove the field
          updateDoc(docRef, {
            notes: deleteField()
          })
            .then(() => {
              console.log(`Notes removed for problem ID ${problem.id}.`);
            })
            .catch(error => {
              console.error("Error removing notes: ", error);
            });
        }
      });
    });

    table.appendChild(tbody);
    topicDiv.appendChild(table);
    problemsList.appendChild(topicDiv);
  });
}

// ==================== Update Overview ====================
async function updateOverview() {
  try {
    const userProblemsRef = collection(db, 'users', currentProfile, 'problems');

    // Total Solved
    const qTotal = query(userProblemsRef, where('completed', '==', true));
    const querySnapshotTotal = await getDocs(qTotal);
    const totalSolved = querySnapshotTotal.size;
    totalSolvedElem.textContent = totalSolved;
    console.log(`Total Solved: ${totalSolved}`);

    // Collect all solved dates
    allSolvedDates = [];
    querySnapshotTotal.forEach(doc => {
      const data = doc.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Calculate and Display Average Solved Per Day
    calculateAverageSolvedPerDay(totalSolved);

    // Render Average Solved Chart
    renderAverageSolvedChart(totalSolved);

    // Update Overall Progress Bar
    updateProgressBar(totalSolved, totalProblemsCount);
  } catch (error) {
    console.error("Error updating overview:", error);
  }
}

// ==================== Calculate Average Solved Per Day ====================
function calculateAverageSolvedPerDay(totalSolved) {
  if (allSolvedDates.length === 0) {
    averageSolvedElem.textContent = '0';
    return;
  }

  // Find the earliest date
  const sortedDates = allSolvedDates.sort((a, b) => a - b);
  const firstDate = sortedDates[0];
  const today = new Date();
  const timeDiff = today - firstDate;
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1;
  const averageSolved = (totalSolved / days).toFixed(2);
  averageSolvedElem.textContent = averageSolved;
  console.log(`Average Solved Per Day: ${averageSolved}`);
}

// ==================== Render Average Solved Chart ====================
function renderAverageSolvedChart(totalSolved) {
  const sortedDates = allSolvedDates.sort((a, b) => a - b);
  const firstDate = sortedDates[0] || new Date();
  const today = new Date();
  const timeDiff = today - firstDate;
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1;
  const averageSolved = (totalSolved / days).toFixed(2);
  const target = 10; // Define your target here
  const percentage = Math.min((averageSolved / target) * 100, 100);

  // Destroy existing chart if exists
  if (window.averageSolvedChart) {
    window.averageSolvedChart.destroy();
  }

  window.averageSolvedChart = new Chart(document.getElementById('average-solved-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Solved', 'Remaining'],
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: ['#1abc9c', '#ecf0f1'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        // Display the average number in the center
        beforeDraw: function(chart) {
          const width = chart.width,
                height = chart.height,
                ctx = chart.ctx;
          ctx.restore();
          const fontSize = (height / 114).toFixed(2);
          ctx.font = `${fontSize}em sans-serif`;
          ctx.textBaseline = "middle";
          const text = averageSolved,
                textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height / 1.5;
          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }
    }
  });

  console.log(`Average Solved: ${averageSolved}, Percentage: ${percentage}%`);
}

// ==================== Update Overall Progress Bar ====================
function updateProgressBar(solved, total) {
  solved = Number(solved);
  total = Number(total);
  const percentage = total === 0 ? 0 : ((solved / total) * 100).toFixed(1);
  console.log(`Progress: ${solved}/${total} (${percentage}%)`);
  overallProgressBar.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
}

// ==================== Clear Detailed Analysis ====================
function clearDetailedAnalysis() {
  const detailedSection = document.getElementById('detailed');
  detailedSection.innerHTML = `
    <p>Select a tab to view detailed analysis.</p>
  `;
}

// ==================== Update Detailed Analysis ====================
async function updateDetailedAnalysis() {
  try {
    const userProblemsRef = collection(db, 'users', currentProfile, 'problems');

    // Total Solved
    const qTotal = query(userProblemsRef, where('completed', '==', true));
    const querySnapshotTotal = await getDocs(qTotal);
    const totalSolved = querySnapshotTotal.size;
    detailedTotalSolvedElem.textContent = totalSolved;
    console.log(`Detailed Total Solved: ${totalSolved}`);

    // Collect all solved dates
    allSolvedDates = [];
    querySnapshotTotal.forEach(doc => {
      const data = doc.data();
      if (data.solvedAt && data.solvedAt.toDate) {
        allSolvedDates.push(data.solvedAt.toDate());
      }
    });

    // Calculate and Display Average Solved Per Day
    calculateAverageSolvedPerDay(totalSolved);
    detailedAverageSolvedElem.textContent = averageSolvedElem.textContent;

    // Topic-wise Solved
    topicWiseSolved = {};
    problemsData.topics.forEach(topic => {
      topicWiseSolved[topic.name] = 0;
    });

    querySnapshotTotal.forEach(doc => {
      const data = doc.data();
      if (data.topic && topicWiseSolved.hasOwnProperty(data.topic)) {
        topicWiseSolved[data.topic] += 1;
      }
    });

    renderTopicProgress();

    // Render Graphs
    renderSolvesOverTimeChart();
    renderDifficultyDistributionChart();
  } catch (error) {
    console.error("Error updating detailed analysis:", error);
  }
}

// ==================== Render Topic Progress ====================
function renderTopicProgress() {
  topicProgressContainer.innerHTML = ''; // Clear existing

  for (const [topic, count] of Object.entries(topicWiseSolved)) {
    // Find total problems in this topic
    const topicData = problemsData.topics.find(t => t.name === topic);
    const totalProblems = topicData ? topicData.problems.length : 1;
    const percentage = Math.min((count / totalProblems) * 100, 100).toFixed(1);

    // Create topic progress card
    const topicDiv = document.createElement('div');
    topicDiv.classList.add('topic-progress');

    // Canvas for progress circle
    const canvas = document.createElement('canvas');
    canvas.id = `topic-chart-${topic}`;
    canvas.width = 100;
    canvas.height = 100;
    topicDiv.appendChild(canvas);

    // Topic Name
    const topicName = document.createElement('h4');
    topicName.textContent = topic;
    topicDiv.appendChild(topicName);

    topicProgressContainer.appendChild(topicDiv);

    // Render Chart
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Solved', 'Remaining'],
        datasets: [{
          data: [percentage, 100 - percentage],
          backgroundColor: ['#e74c3c', '#ecf0f1'],
          borderWidth: 0
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        plugins: {
          tooltip: { enabled: false },
          legend: { display: false },
          beforeDraw: function(chart) {
            const width = chart.width,
                  height = chart.height,
                  ctx = chart.ctx;
            ctx.restore();
            const fontSize = (height / 114).toFixed(2);
            ctx.font = `${fontSize}em sans-serif`;
            ctx.textBaseline = "middle";
            const text = `${percentage}%`,
                  textX = Math.round((width - ctx.measureText(text).width) / 2),
                  textY = height / 1.5;
            ctx.fillText(text, textX, textY);
            ctx.save();
          }
        }
      }
    });

    console.log(`Topic: ${topic}, Solved: ${count}/${totalProblems} (${percentage}%)`);
  }
}

// ==================== Render Solves Over Time Chart ====================
function renderSolvesOverTimeChart() {
  // Prepare data: Count solves per day
  const solveCounts = {};
  allSolvedDates.forEach(date => {
    const day = date.toISOString().split('T')[0];
    solveCounts[day] = (solveCounts[day] || 0) + 1;
  });

  // Sort dates
  const sortedDays = Object.keys(solveCounts).sort();

  const data = sortedDays.map(day => solveCounts[day]);

  // Destroy existing chart if exists
  if (window.solvesOverTimeChart) {
    window.solvesOverTimeChart.destroy();
  }

  window.solvesOverTimeChart = new Chart(solvesOverTimeChartCtx, {
    type: 'line',
    data: {
      labels: sortedDays,
      datasets: [{
        label: 'Problems Solved Over Time',
        data: data,
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26, 188, 156, 0.2)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: { 
          title: { display: true, text: 'Date' },
          ticks: { maxRotation: 90, minRotation: 45 }
        },
        y: { 
          title: { display: true, text: 'Number of Problems Solved' },
          beginAtZero: true,
          precision: 0
        }
      }
    }
  });

  console.log('Rendered Solves Over Time Chart');
}

// ==================== Render Difficulty Distribution Chart ====================
async function renderDifficultyDistributionChart() {
  try {
    const userProblemsRef = collection(db, 'users', currentProfile, 'problems');
    const qCompleted = query(userProblemsRef, where('completed', '==', true));
    const snapshot = await getDocs(qCompleted);

    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.difficulty && difficultyCounts.hasOwnProperty(data.difficulty)) {
        difficultyCounts[data.difficulty] += 1;
      }
    });

    const labels = Object.keys(difficultyCounts);
    const data = Object.values(difficultyCounts);

    // Destroy existing chart if exists
    if (window.difficultyDistributionChart) {
      window.difficultyDistributionChart.destroy();
    }

    window.difficultyDistributionChart = new Chart(difficultyDistributionChartCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    console.log('Rendered Difficulty Distribution Chart');
  } catch (error) {
    console.error("Error rendering difficulty distribution chart:", error);
  }
}

// ==================== Initial Load ====================
document.addEventListener('DOMContentLoaded', () => {
  loadProblems();
});
