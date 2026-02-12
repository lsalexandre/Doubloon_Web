import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# Chave de segurança para as sessões (pode ser qualquer texto)
app.config['SECRET_KEY'] = 'chave_pirata_123'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# SENHAS (No futuro, podemos colocar no banco, mas aqui é mais rápido)
SENHA_MESTRA = "admin123" # Você tem acesso total
SENHA_COMUM = "user123"   # Seus colegas apenas veem

# --- MODELO ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))

with app.app_context():
    db.create_all()

# --- DECORATOR DE SEGURANÇA ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        senha = request.form.get('senha')
        if senha == SENHA_MESTRA:
            session['role'] = 'admin'
            return redirect(url_for('home'))
        elif senha == SENHA_COMUM:
            session['role'] = 'user'
            return redirect(url_for('home'))
        else:
            return "Senha Incorreta, Marujo!"
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    itens = Item.query.all()
    # Enviamos o 'role' para o HTML saber o que mostrar
    return render_template('index.html', itens=itens, role=session.get('role'))

@app.route('/adicionar', methods=['POST'])
@login_required
def adicionar():
    # Só permite se for admin
    if session.get('role') != 'admin':
        return "Acesso Negado!", 403
        
    nome_item = request.form.get('nome')
    cat_item = request.form.get('categoria')
    qtd_item = request.form.get('quantidade')

    novo_item = Item(nome=nome_item, categoria=cat_item, quantity=qtd_item)
    db.session.add(novo_item)
    db.session.commit()
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)