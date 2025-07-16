from flask import Flask, render_template, request
import subprocess
import os

app = Flask(__name__)
pair_code_visible = False

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        phone_number = request.form.get("number")
        if phone_number:
            subprocess.Popen(["node", "bot.js"])
            return render_template("pair.html", number=phone_number, pair_code=True)
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
