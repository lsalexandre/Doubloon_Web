import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# CONFIGURAÇÕES DE SEGURANÇA (Via Variáveis de Ambiente)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave_padrao_local')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELO DO BANCO DE DADOS ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

# Cria as tabelas automaticamente
with app.app_context():
    db.create_all()

# --- DECORATOR PARA PROTEGER ROTAS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS DO SISTEMA ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        senha_digitada = request.form.get('senha')
        
        # Compara com as variáveis que você configurou no Render
        if senha_digitada == os.environ.get('SENHA_MESTRA'):
            session['role'] = 'admin'
            return redirect(url_for('home'))
        elif senha_digitada == os.environ.get('SENHA_COMUM'):
            session['role'] = 'user'
            return redirect(url_for('home'))
        else:
            return "Acesso Negado, Marujo! Senha incorreta."
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    itens = Item.query.all()
    # Passamos o cargo (role) para o HTML saber se mostra ou não o formulário
    return render_template('index.html', itens=itens, role=session.get('role'))

@app.route('/adicionar', methods=['POST'])
@login_required
def adicionar():
    # Segurança extra: se alguém tentar enviar o formulário sem ser admin
    if session.get('role') != 'admin':
        return "Erro: Você não tem permissão de Capitão para cadastrar itens.", 403
        
    nome_item = request.form.get('nome')
    cat_item = request.form.get('categoria')
    qtd_item = request.form.get('quantidade')

    novo_item = Item(nome=nome_item, categoria=cat_item, quantidade=qtd_item)
    db.session.add(novo_item)
    db.session.commit()
    
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)