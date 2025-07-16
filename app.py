from flask import Flask, render_template
import subprocess

app = Flask(__name__)
started = False

@app.route("/")
def index():
    global started
    if not started:
        subprocess.Popen(["node", "bot.js"])
        started = True
    return render_template("index.html", pair_code=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
