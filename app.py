import os
import io
import pandas as pd
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, send_file
from flask_sqlalchemy import SQLAlchemy
from functools import wraps

app = Flask(__name__)

# --- CONFIGURAÇÕES DE SEGURANÇA ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'doubloon_master_key_2026')
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

# --- CONTROLE DE ACESSO ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROTAS DE NAVEGAÇÃO (DASHBOARD) ---

@app.route('/')
@login_required
def home():
    # Página Dashboard
    total_itens = Item.query.count()
    ultimos_logs = Log.query.order_by(Log.data.desc()).limit(5).all()
    # Verifica itens com estoque baixo (ex: menos de 5)
    alerta_estoque = Item.query.filter(Item.quantidade < 5).count()
    
    return render_template('index.html', page='dashboard', total=total_itens, logs=ultimos_logs, alerta=alerta_estoque, role=session.get('role'))

@app.route('/inventario')
@login_required
def inventario():
    # Página Inventário (Busca + Filtros)
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    
    query = Item.query
    if search:
        query = query.filter(Item.nome.ilike(f'%{search}%'))
    if category:
        query = query.filter(Item.categoria == category)
        
    itens = query.all()
    categories = db.session.query(Item.categoria).distinct().all()
    
    return render_template('index.html', page='inventario', itens=itens, categories=categories, search=search, selected_cat=category, role=session.get('role'))

@app.route('/carga')
@login_required
def carga():
    # Página Fluxo de Carga
    itens = Item.query.order_by(Item.nome).all()
    return render_template('index.html', page='carga', itens=itens, role=session.get('role'))

@app.route('/relatorios')
@login_required
def relatorios():
    # Página Relatórios Completos
    todos_logs = Log.query.order_by(Log.data.desc()).limit(100).all() # Limite de 100 para não pesar
    return render_template('index.html', page='relatorios', logs=todos_logs, role=session.get('role'))

# --- ROTAS DE AÇÃO (BACKEND) ---

@app.route('/adicionar', methods=['POST'])
@login_required
def adicionar():
    if session.get('role') != 'Diretoria': return "Acesso Negado", 403
    
    novo = Item(
        nome=request.form.get('nome'),
        categoria=request.form.get('categoria'),
        quantidade=request.form.get('quantidade')
    )
    db.session.add(novo)
    
    log = Log(acao=f"Novo Cadastro: {novo.nome}", usuario=session.get('role'))
    db.session.add(log)
    
    db.session.commit()
    return redirect(url_for('inventario'))

@app.route('/movimentar', methods=['POST'])
@login_required
def movimentar():
    item_id = request.form.get('item_id')
    tipo = request.form.get('tipo')
    qtd = int(request.form.get('quantidade'))
    
    item = Item.query.get(item_id)
    if item:
        if tipo == 'entrada':
            item.quantidade += qtd
            msg = f"Entrada Carga: {qtd} un. - {item.nome}"
        else:
            item.quantidade -= qtd
            msg = f"Saída Carga: {qtd} un. - {item.nome}"
            
        db.session.add(Log(acao=msg, usuario=session.get('role')))
        db.session.commit()
        
    return redirect(url_for('carga'))

@app.route('/deletar/<int:id>')
@login_required
def deletar(id):
    if session.get('role') != 'Diretoria': return "Acesso Negado", 403
    item = Item.query.get_or_404(id)
    nome_bkp = item.nome
    db.session.delete(item)
    db.session.add(Log(acao=f"Item Excluído: {nome_bkp}", usuario=session.get('role')))
    db.session.commit()
    return redirect(url_for('inventario'))

@app.route('/editar/<int:id>', methods=['GET', 'POST'])
@login_required
def editar(id):
    if session.get('role') != 'Diretoria': return "Acesso Negado", 403
    item = Item.query.get_or_404(id)
    if request.method == 'POST':
        item.nome = request.form.get('nome')
        item.categoria = request.form.get('categoria')
        item.quantidade = request.form.get('quantidade')
        db.session.add(Log(acao=f"Edição Manual: {item.nome}", usuario=session.get('role')))
        db.session.commit()
        return redirect(url_for('inventario'))
    return render_template('editar.html', item=item)

@app.route('/exportar')
@login_required
def exportar():
    itens = Item.query.all()
    # Gera Excel na memória
    data = [{"ID": i.id, "Item": i.nome, "Categoria": i.categoria, "Saldo Atual": i.quantidade} for i in itens]
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Estoque Doubloon')
    output.seek(0)
    return send_file(output, download_name=f"Inventario_Doubloon_{datetime.now().strftime('%d-%m')}.xlsx", as_attachment=True)

# --- AUTENTICAÇÃO ---

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