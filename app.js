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
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
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
const solvesOverTimeChartCtx = document.getElementById('solves-over-time-chart').getContext('2d');
const difficultyDistributionChartCtx = document.getElementById('difficulty-distribution-chart').getContext('2d');
const topicWiseDistributionContainer = document.getElementById('topic-wise-distribution-container');

// Tabs
const tabButtons = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

// Dark Mode Toggle
const darkModeSwitch = document.getElementById('dark-mode-switch');

// Loading Spinner
const loadingSpinner = document.getElementById('loading-spinner');

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
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
  });
});

// Dark Mode Toggle
// Check for saved user preference, if any, on load of the website
if (localStorage.getItem('dark-mode') === 'enabled') {
  document.body.classList.add('dark-mode');
  darkModeSwitch.checked = true;
}

// Listen for toggle changes
darkModeSwitch.addEventListener('change', () => {
  if (darkModeSwitch.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('dark-mode', 'enabled');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('dark-mode', 'disabled');
  }
});

// ==================== Load Problems ====================
async function loadProblems() {
  loadingSpinner.style.display = 'flex'; // Show spinner
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
    updateDetailedAnalysis();
  } catch (error) {
    console.error('Error loading problems:', error);
    problemsList.innerHTML = `<p>Error loading problems. Please try again later.</p>`;
  } finally {
    loadingSpinner.style.display = 'none'; // Hide spinner
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
      checkbox.setAttribute('aria-label', `Mark problem ${problem.title} as completed`);
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
      notesInput.setAttribute('aria-label', `Add notes for problem ${problem.title}`);
      notesCell.appendChild(notesInput);
      row.appendChild(notesCell);

      // Link
      const linkCell = document.createElement('td');
      const linkIcon = document.createElement('a');
      linkIcon.href = problem.link;
      linkIcon.target = '_blank';
      linkIcon.title = `Go to Problem ${problem.title}`;
      linkIcon.setAttribute('aria-label', `Go to problem ${problem.title}`);
      linkIcon.innerHTML = '<i class="fas fa-external-link-alt"></i>';
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
    }); // Close topic.problems.forEach

    table.appendChild(tbody);
    topicDiv.appendChild(table);
    problemsList.appendChild(topicDiv);
  }); // Close problemsData.topics.forEach
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
      cutout: '70%',
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        // Display the average number in the center
        beforeDraw: function(chart) {
          const { ctx, width, height } = chart;
          ctx.restore();
          const fontSize = (height / 160).toFixed(2);
          ctx.font = `${fontSize}em Roboto`;
          ctx.textBaseline = "middle";
          const text = averageSolved,
                textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height / 2;
          ctx.fillStyle = '#34495e';
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
  overallProgressBar.setAttribute('aria-valuenow', percentage);
  progressPercentage.textContent = `${percentage}%`;
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

    // Render Graphs
    renderSolvesOverTimeChart();
    renderDifficultyDistributionChart();

    // Render Topic-Wise Difficulty Distribution
    renderTopicWiseDistribution(topicWiseSolved);
  } catch (error) {
    console.error("Error updating detailed analysis:", error);
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
        label: 'Problems Solved',
        data: data,
        borderColor: '#1abc9c',
        backgroundColor: 'rgba(26, 188, 156, 0.2)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1abc9c',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#1abc9c'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { 
          title: { display: true, text: 'Date' },
          ticks: { maxRotation: 90, minRotation: 45 },
          grid: { display: false }
        },
        y: { 
          title: { display: true, text: 'Number of Problems Solved' },
          beginAtZero: true,
          precision: 0,
          grid: { color: '#f0f0f0' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { 
          backgroundColor: '#1abc9c',
          titleColor: '#fff',
          bodyColor: '#fff'
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
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { 
            backgroundColor: '#34495e',
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        }
      }
    });

    console.log('Rendered Difficulty Distribution Chart');
  } catch (error) {
    console.error("Error rendering difficulty distribution chart:", error);
  }
}

// ==================== Render Topic-Wise Difficulty Distribution ====================
function renderTopicWiseDistribution(topicWiseSolved) {
  // Gather per-topic difficulty counts
  const topicDifficultyCounts = {};
  problemsData.topics.forEach(topic => {
    topicDifficultyCounts[topic.name] = { Easy: 0, Medium: 0, Hard: 0 };
  });

  // Query all completed problems
  const userProblemsRef = collection(db, 'users', currentProfile, 'problems');
  const qCompleted = query(userProblemsRef, where('completed', '==', true));

  getDocs(qCompleted).then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (
        data.topic &&
        topicDifficultyCounts[data.topic] &&
        data.difficulty &&
        topicDifficultyCounts[data.topic][data.difficulty] !== undefined
      ) {
        topicDifficultyCounts[data.topic][data.difficulty] += 1;
      }
    });

    // Render each topic's difficulty distribution
    renderTopicWiseDistributionCharts(topicDifficultyCounts);
  }).catch(error => {
    console.error("Error fetching completed problems for topic-wise distribution:", error);
  });
}

// Helper function to render topic-wise distribution charts
function renderTopicWiseDistributionCharts(topicDifficultyCounts) {
  // Clear existing content
  topicWiseDistributionContainer.innerHTML = '';

  // Iterate over each topic
  Object.entries(topicDifficultyCounts).forEach(([topicName, counts]) => {
    const total = counts.Easy + counts.Medium + counts.Hard;

    // Only display topics with at least one solved problem
    if (total === 0) return;

    // Create card
    const card = document.createElement('div');
    card.classList.add('topic-wise-distribution-card');

    // Heading
    const heading = document.createElement('h3');
    heading.textContent = `${topicName}`;
    card.appendChild(heading);

    // Breakdown Text
    const breakdown = document.createElement('p');
    breakdown.textContent = `Solved: ${total} (${counts.Easy} Easy, ${counts.Medium} Medium, ${counts.Hard} Hard)`;
    card.appendChild(breakdown);

    // Canvas for Pie Chart
    const canvas = document.createElement('canvas');
    canvas.id = `topic-wise-chart-${topicName.replace(/\s+/g, '-')}`;
    canvas.setAttribute('aria-label', `Difficulty Distribution for ${topicName}`);
    canvas.setAttribute('role', 'img');
    card.appendChild(canvas);

    // Append card to container
    topicWiseDistributionContainer.appendChild(card);

    // Render Pie Chart
    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [{
          data: [counts.Easy, counts.Medium, counts.Hard],
          backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
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

// ==================== Initial Load ====================
document.addEventListener('DOMContentLoaded', () => {
  loadProblems();
});
