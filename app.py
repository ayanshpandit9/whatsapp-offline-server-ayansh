from flask import Flask, render_template, request
import subprocess, threading, os

app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def start_bot():
    subprocess.Popen(["node", "bot.js"])

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/pair", methods=["POST"])
def pair():
    country = request.form.get("country")
    number = request.form.get("number")
    full_number = f"{country}{number}"
    with open(os.path.join(UPLOAD_FOLDER, "session.txt"), "w") as f:
        f.write(full_number)
    return render_template("panel.html", phone=full_number)

@app.route("/start", methods=["POST"])
def start():
    jid = request.form.get("jid")
    delay = request.form.get("delay")
    prefix = request.form.get("prefix")
    name = request.form.get("name")
    msg_file = request.files["msgfile"]

    if msg_file:
        msg_file.save(os.path.join(UPLOAD_FOLDER, "messages.txt"))

    with open(os.path.join(UPLOAD_FOLDER, "config.txt"), "w") as f:
        f.write(f"{jid}\n{delay}\n{prefix}\n{name}")

    return "✅ Bot Started (Check logs for confirmation)"

if __name__ == "__main__":
    threading.Thread(target=start_bot).start()
    app.run(host="0.0.0.0", port=10000)
