from flask import Flask, request, render_template
import os, subprocess, threading

app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def start_bot():
    subprocess.Popen(["node", "web/bot.js"])

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        target = request.form.get("target")
        delay = request.form.get("delay")
        message_file = request.files["messageFile"]

        if message_file:
            path = os.path.join(UPLOAD_FOLDER, "messages.txt")
            message_file.save(path)
            with open(os.path.join(UPLOAD_FOLDER, "config.txt"), "w") as f:
                f.write(f"{target}\n{delay}")

        return "✅ Uploaded. Bot will start shortly..."

    return render_template("index.html")

if __name__ == "__main__":
    threading.Thread(target=start_bot).start()
    app.run(host="0.0.0.0", port=10000)
