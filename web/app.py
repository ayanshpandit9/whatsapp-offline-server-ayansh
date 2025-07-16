from flask import Flask, request, render_template
import os

app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
        return "✅ Files uploaded. Bot will start messaging shortly."

    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
