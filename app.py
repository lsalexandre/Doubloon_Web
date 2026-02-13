import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# CONFIGURAÇÕES DE SISTEMA
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_security_token_2026')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELO DE DADOS ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

with app.app_context():
    db.create_all()

# --- PROTOCOLO DE ACESSO ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS DE AUTENTICAÇÃO ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        auth_key = request.form.get('senha')
        if auth_key == os.environ.get('SENHA_MESTRA'):
            session['role'] = 'administrator'
            return redirect(url_for('home'))
        elif auth_key == os.environ.get('SENHA_COMUM'):
            session['role'] = 'staff'
            return redirect(url_for('home'))
        else:
            return "Erro de Autenticação: Credenciais Inválidas."
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- ROTAS DE OPERAÇÃO ---

@app.route('/')
@login_required
def home():
    itens = Item.query.all()
    return render_template('index.html', itens=itens, role=session.get('role'))

@app.route('/adicionar', methods=['POST'])
@login_required
def adicionar():
    if session.get('role') != 'administrator':
        return "Acesso Negado: Permissão Insuficiente", 403
        
    novo_item = Item(
        nome=request.form.get('nome'),
        categoria=request.form.get('categoria'),
        quantidade=request.form.get('quantidade')
    )
    db.session.add(novo_item)
    db.session.commit()
    return redirect(url_for('home'))

@app.route('/deletar/<int:id>')
@login_required
def deletar(id):
    if session.get('role') != 'administrator':
        return "Acesso Negado", 403
    item = Item.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return redirect(url_for('home'))

@app.route('/editar/<int:id>', methods=['GET', 'POST'])
@login_required
def editar(id):
    if session.get('role') != 'administrator':
        return "Acesso Negado", 403
    item = Item.query.get_or_404(id)
    if request.method == 'POST':
        item.nome = request.form.get('nome')
        item.categoria = request.form.get('categoria')
        item.quantidade = request.form.get('quantidade')
        db.session.commit()
        return redirect(url_for('home'))
    return render_template('editar.html', item=item)

if __name__ == '__main__':
    app.run(debug=True)