from flask import Flask, render_template

app = Flask(__name__)

# Rota principal - A porta de entrada do seu sistema
@app.route('/')
def home():
    # Por enquanto, apenas renderiza a página inicial
    return render_template('index.html')

if __name__ == '__main__':
    # Roda localmente para teste (o Render usará o gunicorn)
    app.run(debug=True)