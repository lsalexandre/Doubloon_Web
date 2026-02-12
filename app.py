import os
from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Configuração da conexão segura com a Variável de Ambiente que você criou
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELO DO BANCO DE DADOS (Seu Arsenal) ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

# Criar as tabelas automaticamente no Render
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    # Busca todos os itens do banco para mostrar no dashboard
    itens = Item.query.all()
    return render_template('index.html', itens=itens)

if __name__ == '__main__':
    app.run(debug=True)