
from flask import Flask, jsonify, render_template
import random
import sqlite3
from datetime import datetime

app = Flask(__name__)

DATABASE = "digital_twin.db"

# Simulated machine readings
temperature = 45.0
vibration = 2.0
speed = 1500


# Create the database and table automatically
def init_db():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine TEXT NOT NULL,
                temperature REAL NOT NULL,
                vibration REAL NOT NULL,
                speed INTEGER NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        conn.commit()


# Save one sensor reading
def save_reading(data):
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            INSERT INTO sensor_readings
            (machine, temperature, vibration, speed,
             status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data["machine"],
            data["temperature"],
            data["vibration"],
            data["speed"],
            data["status"],
            data["timestamp"]
        ))
        conn.commit()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/sensor-data")
def sensor_data():
    global temperature, vibration, speed

    # Generate simulated sensor readings
    temperature += random.uniform(-1.0, 1.5)
    temperature = max(30.0, min(temperature, 100.0))

    vibration += random.uniform(-0.3, 0.4)
    vibration = max(0.5, min(vibration, 9.0))

    speed += random.randint(-20, 20)
    speed = max(1000, min(speed, 1800))

    # Analyze machine health
    if temperature >= 90 or vibration >= 7:
        status = "Critical"
    elif temperature >= 75 or vibration >= 4:
        status = "Warning"
    else:
        status = "Normal"

    reading = {
        "machine": "Electric Motor 01",
        "temperature": round(temperature, 2),
        "vibration": round(vibration, 2),
        "speed": speed,
        "status": status,
        "timestamp": datetime.now().isoformat(
            timespec="seconds"
        ),
        "data_source": "simulation"
    }

    # Save every generated reading to SQLite
    save_reading(reading)

    return jsonify(reading)


# Retrieve historical readings
@app.route("/api/history")
def history():
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row

        rows = conn.execute("""
            SELECT * FROM sensor_readings
            ORDER BY id DESC
            LIMIT 50
        """).fetchall()

    return jsonify([dict(row) for row in rows])


# Machine health analysis using stored readings
@app.route("/api/health-analysis")
def health_analysis():
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row

        rows = conn.execute("""
            SELECT temperature, vibration, speed, status, timestamp
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT 20
        """).fetchall()

    readings = [dict(row) for row in rows]

    if not readings:
        return jsonify({
            "message": "No sensor readings available yet"
        }), 200

    avg_temperature = sum(
        r["temperature"] for r in readings
    ) / len(readings)

    avg_vibration = sum(
        r["vibration"] for r in readings
    ) / len(readings)

    latest = readings[0]

    if latest["temperature"] >= 90 or latest["vibration"] >= 7:
        health = "Critical"
        message = "High temperature or vibration detected."
    elif latest["temperature"] >= 75 or latest["vibration"] >= 4:
        health = "Warning"
        message = "Monitor the motor closely."
    else:
        health = "Normal"
        message = "Current readings are within configured limits."

    
        
    # Calculate a simple sensor-based health score
    temperature_score = max(
        0, 100 - max(0, latest["temperature"] - 40) * 1.5
    )

    vibration_score = max(
        0, 100 - max(0, latest["vibration"] - 1) * 12
    )

    health_score = round(
        (temperature_score + vibration_score) / 2
    )

    return jsonify({
        "machine": "Electric Motor 01",
        "health": health,
        "health_score": health_score,
        "message": message,
        "average_temperature": round(avg_temperature, 2),
        "average_vibration": round(avg_vibration, 2),
        "readings_analyzed": len(readings),
        "latest_timestamp": latest["timestamp"]
    })


# Rule-based fault-risk estimation
@app.route("/api/fault-prediction")
def fault_prediction():
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row

        rows = conn.execute("""
            SELECT temperature, vibration, speed, timestamp
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT 5
        """).fetchall()

    readings = [dict(row) for row in rows]

    if not readings:
        return jsonify({
            "risk": "Unknown",
            "message": "Waiting for sensor readings."
        })

    latest = readings[0]

    # Reverse to put oldest reading first
    readings.reverse()

    temp_rising = (
        len(readings) >= 3 and
        all(
            readings[i]["temperature"]
            > readings[i - 1]["temperature"]
            for i in range(len(readings) - 2, len(readings))
        )
    )

    vibration_rising = (
        len(readings) >= 3 and
        all(
            readings[i]["vibration"]
            > readings[i - 1]["vibration"]
            for i in range(len(readings) - 2, len(readings))
        )
    )

    
    alerts = []

    if latest["temperature"] >= 90:
        alerts.append("Critical: Motor temperature is very high.")
    elif latest["temperature"] >= 75:
        alerts.append("Warning: Motor temperature is elevated.")

    if latest["vibration"] >= 7:
        alerts.append("Critical: Excessive motor vibration.")
    elif latest["vibration"] >= 4:
        alerts.append("Warning: Motor vibration is elevated.")

    if temp_rising and vibration_rising:
        alerts.append(
            "Both temperature and vibration are rising."
        )

    if latest["temperature"] >= 90 or latest["vibration"] >= 7:
        risk = "High"
        message = "Critical sensor threshold reached. Inspect the motor."
    elif alerts:
        risk = "Medium"
        message = "Abnormal readings detected. Continue monitoring."
    else:
        risk = "Low"
        message = "No major risk detected by the current rules."


    return jsonify({
        "machine": "Electric Motor 01",
        "risk": risk,
        "message": message,
        "alerts": alerts,
        "temperature_trend_rising": temp_rising,
        "vibration_trend_rising": vibration_rising,
        "readings_analyzed": len(readings),
        "method": "Rule-based simulation"
    })

# Create database before starting the server
init_db()

if __name__ == "__main__":
    app.run(debug=True)
