
const temperatureElement = document.getElementById("temperature");
const vibrationElement = document.getElementById("vibration");
const speedElement = document.getElementById("speed");
const statusElement = document.getElementById("status");
const timestampElement = document.getElementById("timestamp");
const alertElement = document.getElementById("alertMessage");

const labels = [];
const temperatureHistory = [];

const chartContext = document.getElementById("sensorChart");

const sensorChart = new Chart(chartContext, {
    type: "line",
    data: {
        labels: labels,
        datasets: [{
            label: "Temperature (°C)",
            data: temperatureHistory,
            borderColor: "#3978db",
            backgroundColor: "rgba(57, 120, 219, 0.12)",
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: "Temperature (°C)"
                }
            },
            x: {
                ticks: {
                    maxTicksLimit: 6
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

async function updateDashboard() {
    try {
        const response = await fetch("/api/sensor-data");

        if (!response.ok) {
            throw new Error("Server returned " + response.status);
        }

        const data = await response.json();

        // Update sensor readings
        temperatureElement.textContent = data.temperature.toFixed(1);
        vibrationElement.textContent = data.vibration.toFixed(2);
        speedElement.textContent = data.speed;

        // Update machine status
        statusElement.textContent = data.status.toUpperCase();
        statusElement.className =
            "status " + data.status.toLowerCase();

        // Update latest timestamp
        timestampElement.textContent =
            new Date(data.timestamp).toLocaleTimeString();

        // Update alert message
        if (data.status === "Critical") {
            alertElement.textContent =
                "CRITICAL: Check machine temperature or vibration!";
            alertElement.className = "alert-message critical";
        } else if (data.status === "Warning") {
            alertElement.textContent =
                "WARNING: Machine readings need attention.";
            alertElement.className = "alert-message warning";
        } else {
            alertElement.textContent =
                "Machine is operating within configured limits.";
            alertElement.className = "alert-message";
        }

        // Add new temperature reading to chart
        labels.push(new Date(data.timestamp).toLocaleTimeString());
        temperatureHistory.push(data.temperature);

        // Keep only the latest 15 readings
        if (labels.length > 15) {
            labels.shift();
            temperatureHistory.shift();
        }

        sensorChart.update();

    } catch (error) {
        console.error("Sensor data error:", error);

        alertElement.textContent =
            "Connection lost. Check the Flask server.";
        alertElement.className = "alert-message critical";
    }
}

// Load data immediately, then every 2 seconds
updateDashboard();
setInterval(updateDashboard, 2000);

async function updateHealthAnalysis() {
    try {
        const response = await fetch("/api/health-analysis");
        if (!response.ok) throw new Error("Health API failed");

        const data = await response.json();

        document.getElementById("avgTemperature").textContent =
            data.average_temperature + " °C";

        document.getElementById("avgVibration").textContent =
            data.average_vibration + " mm/s";

        document.getElementById("readingsAnalyzed").textContent =
            data.readings_analyzed;

        document.getElementById("healthStatus").textContent =
            data.health;
        
const score = data.health_score;

const scoreText = document.getElementById("healthScore");
const scoreBar = document.getElementById("healthScoreBar");
const scoreLabel = document.getElementById("healthScoreLabel");

scoreText.textContent = score + "%";
scoreBar.style.width = score + "%";

scoreBar.classList.remove("warning", "critical");

if (score < 50) {
    scoreBar.classList.add("critical");
    scoreLabel.textContent = "Poor health indicator";
} else if (score < 75) {
    scoreBar.classList.add("warning");
    scoreLabel.textContent = "Monitor the machine";
} else {
    scoreLabel.textContent = "Good health indicator";
}

        document.getElementById("healthMessage").textContent =
            data.message;
    } catch (error) {
        document.getElementById("healthMessage").textContent =
            "Unable to load health analysis.";
    }
}

async function updateFaultPrediction() {
    try {
        const response = await fetch("/api/fault-prediction");
        if (!response.ok) throw new Error("Prediction API failed");

        const data = await response.json();

        document.getElementById("faultRisk").textContent =
            data.risk;

        document.getElementById("faultMessage").textContent =
            data.message;
        
const alertList = document.getElementById("faultAlerts");
alertList.replaceChildren();

if (data.alerts && data.alerts.length > 0) {
    data.alerts.forEach((alert) => {
        const item = document.createElement("li");
        item.textContent = alert;

        if (alert.startsWith("Critical:")) {
            item.className = "critical-alert";
        } else {
            item.className = "warning-alert";
        }

        alertList.appendChild(item);
    });
} else {
    const item = document.createElement("li");
    item.textContent = "No abnormal conditions detected.";
    item.className = "no-alert";
    alertList.appendChild(item);
}

    } catch (error) {
        document.getElementById("faultMessage").textContent =
            "Unable to load fault prediction.";
    }
    
}

// Load immediately and refresh every 5 seconds
updateHealthAnalysis();
updateFaultPrediction();

setInterval(() => {
    updateHealthAnalysis();
    updateFaultPrediction();
}, 5000);

let historyChart = null;

async function updateHistoryChart() {
    const message = document.getElementById("historyMessage");

    try {
        const response = await fetch("/api/history");

        if (!response.ok) {
            throw new Error("Unable to fetch history");
        }

        const data = await response.json();

        if (data.length === 0) {
            message.textContent =
                "No historical readings yet. Wait for sensor data.";
            return;
        }

        // API returns newest first; chart needs oldest first
        data.reverse();

        const labels = data.map((item) =>
            new Date(item.timestamp).toLocaleTimeString()
        );

        const temperatures = data.map(
            (item) => item.temperature
        );

        const vibrations = data.map(
            (item) => item.vibration
        );

        const canvas = document.getElementById("historyChart");

        if (historyChart) {
            historyChart.data.labels = labels;
            historyChart.data.datasets[0].data = temperatures;
            historyChart.data.datasets[1].data = vibrations;
            historyChart.update();
        } else {
            historyChart = new Chart(canvas, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Temperature (°C)",
                            data: temperatures,
                            borderColor: "#3B82F6",
                            backgroundColor: "#3B82F622",
                            yAxisID: "y",
                            tension: 0.3
                        },
                        {
                            label: "Vibration (mm/s)",
                            data: vibrations,
                            borderColor: "#F59E0B",
                            backgroundColor: "#F59E0B22",
                            yAxisID: "y1",
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: "index",
                        intersect: false
                    },
                    scales: {
                        y: {
                            type: "linear",
                            position: "left",
                            title: {
                                display: true,
                                text: "Temperature (°C)"
                            }
                        },
                        y1: {
                            type: "linear",
                            position: "right",
                            title: {
                                display: true,
                                text: "Vibration (mm/s)"
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
        }

        message.textContent =
            "Showing " + data.length + " saved readings.";

    } catch (error) {
        message.textContent =
            "Could not load history. Check Flask and the browser console.";
        console.error(error);
    }
}

// Load historical graph immediately
updateHistoryChart();

// Refresh the graph every 5 seconds
setInterval(updateHistoryChart, 5000);
