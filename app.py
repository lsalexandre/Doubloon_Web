import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# CONFIGURAÇÕES CORPORATIVAS
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'seguranca_aviiva_2026')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- MODELOS DE DADOS ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    acao = db.Column(db.String(200))
    data = db.Column(db.DateTime, default=datetime.utcnow)
    usuario = db.Column(db.String(50))

with app.app_context():
    db.create_all()

# --- SEGURANÇA ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS DE OPERAÇÃO ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        senha = request.form.get('senha')
        if senha == os.environ.get('SENHA_MESTRA'):
            session['role'] = 'Administrator'
            return redirect(url_for('home'))
        elif senha == os.environ.get('SENHA_COMUM'):
            session['role'] = 'Staff'
            return redirect(url_for('home'))
        return "Erro: Credenciais Inválidas."
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    search = request.args.get('search')
    category = request.args.get('category')
    
    query = Item.query
    if search:
        query = query.filter(Item.nome.ilike(f'%{search}%'))
    if category:
        query = query.filter(Item.categoria == category)
    
    itens = query.all()
    categories = db.session.query(Item.categoria).distinct().all()
    logs = Log.query.order_by(Log.data.desc()).limit(5).all()
    
    return render_template('index.html', itens=itens, categories=categories, logs=logs, role=session.get('role'))

@app.route('/adicionar', methods=['POST'])
@login_required
def adicionar():
    if session.get('role') != 'Administrator': return "Negado", 403
    
    novo = Item(nome=request.form.get('nome'), 
                categoria=request.form.get('categoria'), 
                quantidade=request.form.get('quantidade'))
    
    log = Log(acao=f"Adicionou {novo.nome}", usuario=session.get('role'))
    db.session.add(novo)
    db.session.add(log)
    db.session.commit()
    return redirect(url_for('home'))

@app.route('/deletar/<int:id>')
@login_required
def deletar(id):
    if session.get('role') != 'Administrator': return "Negado", 403
    item = Item.query.get_or_404(id)
    log = Log(acao=f"Excluiu {item.nome}", usuario=session.get('role'))
    db.session.delete(item)
    db.session.add(log)
    db.session.commit()
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)