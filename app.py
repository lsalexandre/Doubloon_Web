import os
from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Configuração da conexão segura com a Variável de Ambiente do Render
# Pega a URL do banco que você configurou no painel do Render
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELO DO BANCO DE DADOS (Seu Arsenal) ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

# Cria as tabelas automaticamente no banco PostgreSQL do Render
with app.app_context():
    db.create_all()

# ROTA 1: Dashboard (Lista os itens)
@app.route('/')
def home():
    itens = Item.query.all()
    return render_template('index.html', itens=itens)

# ROTA 2: Adicionar Item (Recebe os dados do formulário)
@app.route('/adicionar', methods=['POST'])
def adicionar():
    nome_item = request.form.get('nome')
    cat_item = request.form.get('categoria')
    qtd_item = request.form.get('quantidade')

    # Cria e salva o novo item no baú
    novo_item = Item(nome=nome_item, categoria=cat_item, quantidade=qtd_item)
    db.session.add(novo_item)
    db.session.commit()
    
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)