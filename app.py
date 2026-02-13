import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# CONFIGURAÇÕES
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'seguranca_doubloon_2026')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# MODELO SIMPLES PARA TESTE DE LAYOUT
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

with app.app_context():
    db.create_all()

# SEGURANÇA
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ROTAS DE NAVEGAÇÃO
@app.route('/')
@login_required
def home():
    # Dashboard: Visão Geral
    total_itens = Item.query.count()
    return render_template('index.html', page='dashboard', total=total_itens, role=session.get('role'))

@app.route('/inventario')
@login_required
def inventario():
    itens = Item.query.all()
    return render_template('index.html', page='inventario', itens=itens, role=session.get('role'))

@app.route('/carga')
@login_required
def carga():
    return render_template('index.html', page='carga', role=session.get('role'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        senha = request.form.get('senha')
        if senha == os.environ.get('SENHA_MESTRA'):
            session['role'] = 'Diretoria'
            return redirect(url_for('home'))
        elif senha == os.environ.get('SENHA_COMUM'):
            session['role'] = 'Operacional'
            return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)