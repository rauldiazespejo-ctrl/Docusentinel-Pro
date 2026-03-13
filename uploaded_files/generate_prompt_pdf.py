from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.units import inch, cm
import os

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Microsoft YaHei', '/usr/share/fonts/truetype/chinese/msyh.ttf'))

registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')
registerFontFamily('Microsoft YaHei', normal='Microsoft YaHei', bold='Microsoft YaHei')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/Prompt_DocuSentinel_Pro.pdf",
    pagesize=letter,
    title="Prompt DocuSentinel Pro",
    author='Z.ai',
    creator='Z.ai',
    subject='Prompt para desarrollo de aplicacion de gestion documental'
)

story = []
styles = getSampleStyleSheet()

# Custom styles
cover_title_style = ParagraphStyle(
    name='CoverTitle',
    fontName='Times New Roman',
    fontSize=36,
    leading=44,
    alignment=TA_CENTER,
    spaceAfter=24
)

cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle',
    fontName='Times New Roman',
    fontSize=18,
    leading=26,
    alignment=TA_CENTER,
    spaceAfter=36
)

heading1_style = ParagraphStyle(
    name='CustomH1',
    fontName='Times New Roman',
    fontSize=18,
    leading=24,
    alignment=TA_LEFT,
    spaceBefore=18,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79')
)

heading2_style = ParagraphStyle(
    name='CustomH2',
    fontName='Times New Roman',
    fontSize=14,
    leading=20,
    alignment=TA_LEFT,
    spaceBefore=14,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

heading3_style = ParagraphStyle(
    name='CustomH3',
    fontName='Times New Roman',
    fontSize=12,
    leading=16,
    alignment=TA_LEFT,
    spaceBefore=10,
    spaceAfter=6,
    textColor=colors.HexColor('#404040')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=11,
    leading=16,
    alignment=TA_JUSTIFY,
    spaceAfter=8
)

code_style = ParagraphStyle(
    name='CodeStyle',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    spaceAfter=6,
    leftIndent=20,
    backColor=colors.HexColor('#F5F5F5'),
    borderPadding=8
)

# ===== COVER PAGE =====
story.append(Spacer(1, 60))

# Logo
logo_path = "/home/z/my-project/download/docusentinel_logo.png"
if os.path.exists(logo_path):
    logo = Image(logo_path, width=180, height=180)
    logo.hAlign = 'CENTER'
    story.append(logo)

story.append(Spacer(1, 30))
story.append(Paragraph("<b>DocuSentinel Pro</b>", cover_title_style))
story.append(Spacer(1, 12))
story.append(Paragraph("Prompt para Desarrollo de Sistema Multiagente de IA", cover_subtitle_style))
story.append(Spacer(1, 24))
story.append(Paragraph("Aplicacion de Gestion Integral de Documentos", ParagraphStyle(
    name='CoverDesc',
    fontName='Times New Roman',
    fontSize=14,
    leading=20,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#666666')
)))
story.append(Spacer(1, 60))
story.append(Paragraph("Control de Acceso Seguro + Verificacion de Autenticidad", ParagraphStyle(
    name='CoverTagline',
    fontName='Times New Roman',
    fontSize=12,
    leading=18,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#1F4E79')
)))
story.append(PageBreak())

# ===== TABLE OF CONTENTS =====
story.append(Paragraph("<b>Tabla de Contenidos</b>", heading1_style))
story.append(Spacer(1, 12))

toc_items = [
    ("1. Vision General del Proyecto", "3"),
    ("2. Arquitectura del Sistema", "3"),
    ("3. Modulo 1: Control de Acceso y Auditoria", "4"),
    ("4. Modulo 2: Verificacion de Autenticidad", "6"),
    ("5. Stack Tecnologico Recomendado", "8"),
    ("6. Requisitos de Seguridad", "9"),
    ("7. Prompt Completo para Multiagente", "10"),
]

toc_style = ParagraphStyle(
    name='TOCStyle',
    fontName='Times New Roman',
    fontSize=11,
    leading=18,
    alignment=TA_LEFT
)

for item, page in toc_items:
    story.append(Paragraph(f"{item} {'.'*60} {page}", toc_style))

story.append(PageBreak())

# ===== SECTION 1: VISION GENERAL =====
story.append(Paragraph("<b>1. Vision General del Proyecto</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
<b>DocuSentinel Pro</b> es una plataforma empresarial de gestion documental que combina seguridad de nivel bancario con capacidades avanzadas de verificacion de autenticidad mediante inteligencia artificial. La aplicacion esta disenada para organizaciones que manejan documentacion sensible, legal, financiera o gubernamental donde la integridad y confidencialidad son criticas.
""", body_style))

story.append(Paragraph("<b>1.1 Objetivos Principales</b>", heading2_style))

objectives = [
    "<b>Seguridad Documental:</b> Implementar un sistema de encriptacion multinivel que garantice que solo personal autorizado pueda acceder a documentos sensibles, con registros inmutables de todas las operaciones.",
    "<b>Verificacion de Autenticidad:</b> Desarrollar un motor de analisis documental impulsado por IA capaz de detectar falsificaciones, adulteraciones y manipulaciones en documentos digitales y escaneados.",
    "<b>Auditoria Completa:</b> Mantener un registro forense de todas las operaciones realizadas sobre cada documento, incluyendo accesos, visualizaciones, descargas y verificaciones.",
    "<b>Experiencia Profesional:</b> Ofrecer una interfaz moderna, intuitiva y responsive que cumpla con estandares de usabilidad empresarial."
]

for obj in objectives:
    story.append(Paragraph(f"• {obj}", body_style))

story.append(Spacer(1, 12))

# ===== SECTION 2: ARQUITECTURA =====
story.append(Paragraph("<b>2. Arquitectura del Sistema</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
La arquitectura de <b>DocuSentinel Pro</b> sigue un modelo de microservicios con separacion clara de responsabilidades. El sistema se divide en tres capas principales: la capa de presentacion (frontend), la capa de logica de negocio (backend/API), y la capa de datos y servicios. Esta separacion permite escalabilidad horizontal, mantenimiento independiente de componentes, y facilita la implementacion de politicas de seguridad granulares en cada nivel del sistema.
""", body_style))

story.append(Paragraph("<b>2.1 Diagrama de Componentes</b>", heading2_style))

components_data = [
    [Paragraph('<b>Componente</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Tecnologia</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Funcion</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER))],
    [Paragraph('Frontend Web', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Next.js 14+ / React', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Interfaz de usuario, dashboards, visualizacion', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('API Gateway', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Node.js / Express', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Autenticacion, rate limiting, routing', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Auth Service', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Node.js + JWT + OAuth2', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Gestion de identidades, MFA, permisos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Document Service', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Python / FastAPI', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('CRUD documentos, encriptacion, versionado', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Verification Engine', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Python + TensorFlow/PyTorch', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Analisis de autenticidad con IA', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Audit Service', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Node.js + Elasticsearch', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Logs inmutables, trazabilidad, reportes', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Database', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('PostgreSQL + MongoDB + Redis', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Datos estructurados, documentos, cache', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
]

components_table = Table(components_data, colWidths=[2.2*inch, 1.8*inch, 2.5*inch])
components_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(components_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Tabla 1. Componentes principales del sistema DocuSentinel Pro</i>", ParagraphStyle(
    name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=colors.grey)))

story.append(PageBreak())

# ===== SECTION 3: MODULO 1 - CONTROL DE ACCESO =====
story.append(Paragraph("<b>3. Modulo 1: Control de Acceso y Auditoria</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
El modulo de control de acceso constituye la primera linea de defensa de DocuSentinel Pro. Este componente implementa un sistema de seguridad multicapa que garantiza la confidencialidad e integridad de los documentos almacenados, mientras mantiene un registro inmutable de todas las operaciones realizadas. La arquitectura del modulo combina tecnicas criptograficas modernas con patrones de control de acceso basado en roles (RBAC) y atributos (ABAC), proporcionando una granularidad de permisos sin precedentes.
""", body_style))

story.append(Paragraph("<b>3.1 Sistema de Encriptacion Multinivel</b>", heading2_style))

story.append(Paragraph("""
El sistema de encriptacion implementado en DocuSentinel Pro utiliza un esquema de encriptacion hibrido que combina los algoritmos AES-256-GCM para el cifrado simetrico de documentos y RSA-4096 para el intercambio seguro de claves. Cada documento almacenado en el sistema se cifra de forma independiente con una clave unica derivada de parametros especificos del documento, incluyendo su identificador, metadatos y un salt aleatorio. Esta estrategia garantiza que incluso si un atacante compromete una clave, no podra descifrar otros documentos del sistema.
""", body_style))

encryption_features = [
    "<b>Encriptacion en Reposo:</b> Todos los documentos se almacenan cifrados utilizando AES-256-GCM con claves unicas por documento. Las claves de cifrado se almacenan en un modulo de seguridad de hardware (HSM) o en un gestor de secretos como HashiCorp Vault, nunca en la base de datos principal.",
    "<b>Encriptacion en Transito:</b> Todas las comunicaciones entre clientes y servidores utilizan TLS 1.3 con cipher suites restringidos a algoritmos considerados seguros segun los estandares actuales de NIST.",
    "<b>Encriptacion de Claves:</b> Las claves de cifrado de documentos se cifran adicionalmente con una clave maestra rotada trimestralmente, implementando un esquema de envelope encryption.",
    "<b>Derivacion de Claves:</b> Se utiliza PBKDF2 con 100,000 iteraciones para la derivacion de claves a partir de contrasenas, resistiendo ataques de fuerza bruta y rainbow tables."
]

for feature in encryption_features:
    story.append(Paragraph(f"• {feature}", body_style))

story.append(Paragraph("<b>3.2 Sistema de Autenticacion y Autorizacion</b>", heading2_style))

story.append(Paragraph("""
El sistema de autenticacion implementa un modelo de identidad federada que soporta multiples proveedores de identidad (IdP), permitiendo la integracion con directorios empresariales existentes como Microsoft Active Directory, LDAP, o proveedores SAML 2.0. Adicionalmente, el sistema requiere autenticacion multifactor (MFA) obligatoria para todos los usuarios, soportando aplicaciones autenticadoras (TOTP), claves de seguridad hardware (FIDO2/WebAuthn), y SMS/email como factores secundarios.
""", body_style))

story.append(Paragraph("<b>Modelo de Control de Acceso (RBAC + ABAC):</b>", heading3_style))

access_model = [
    [Paragraph('<b>Nivel</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Rol</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Permisos</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Restricciones</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER))],
    [Paragraph('1', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Super Admin', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Configuracion global, gestion usuarios', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('MFA obligatorio, IP whitelist', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('2', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Admin Documentos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('CRUD documentos, asignar permisos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Solo documentos de su area', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('3', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Auditor', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Solo lectura, ver logs, reportes', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Sin descarga de documentos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('4', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Verificador', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Verificar autenticidad, ver metadatos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Sin acceso a contenido', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('5', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Usuario Estandar', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Ver documentos autorizados', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Sin descarga ni impresion', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
]

access_table = Table(access_model, colWidths=[0.6*inch, 1.3*inch, 2.2*inch, 2.0*inch])
access_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(access_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Tabla 2. Niveles de acceso y roles en el sistema</i>", ParagraphStyle(
    name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=colors.grey)))

story.append(Paragraph("<b>3.3 Sistema de Auditoria y Trazabilidad</b>", heading2_style))

story.append(Paragraph("""
El sistema de auditoria implementa un registro inmutable de todas las operaciones realizadas en el sistema, utilizando una arquitectura de append-only log con sellado criptografico de tiempo. Cada evento se registra con un hash encadenado al evento anterior, creando una cadena de bloques interna que garantiza la integridad del historial. Los registros de auditoria incluyen informacion detallada sobre el usuario, la operacion realizada, los recursos afectados, la direccion IP, el dispositivo utilizado, la marca de tiempo con precision de milisegundos, y el resultado de la operacion.
""", body_style))

audit_events = [
    "<b>Eventos de Autenticacion:</b> Intentos de login (exitosos y fallidos), bloqueos de cuenta, cambios de contrasena, activacion/desactivacion de MFA, sesiones iniciadas y terminadas.",
    "<b>Eventos de Documentos:</b> Creacion, modificacion, eliminacion, visualizacion, descarga, impresion, comparticion, cambio de clasificacion, y reasignacion de permisos.",
    "<b>Eventos de Verificacion:</b> Solicitudes de verificacion de autenticidad, resultados de analisis, alertas de posible falsificacion, y revisiones manuales.",
    "<b>Eventos de Sistema:</b> Cambios de configuracion, actualizaciones de roles, exportacion de reportes, y alertas de seguridad."
]

for event in audit_events:
    story.append(Paragraph(f"• {event}", body_style))

story.append(PageBreak())

# ===== SECTION 4: MODULO 2 - VERIFICACION =====
story.append(Paragraph("<b>4. Modulo 2: Verificacion de Autenticidad</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
El modulo de verificacion de autenticidad representa el componente de inteligencia artificial de DocuSentinel Pro. Este motor de analisis emplea tecnicas avanzadas de vision por computadora y aprendizaje profundo para detectar manipulaciones, falsificaciones y adulteraciones en documentos digitales y escaneados. El sistema es capaz de analizar una amplia variedad de formatos documentales, desde documentos de identidad y certificados hasta contratos y documentos financieros.
""", body_style))

story.append(Paragraph("<b>4.1 Capacidades de Deteccion</b>", heading2_style))

story.append(Paragraph("""
El motor de verificacion implementa multiples modelos de inteligencia artificial entrenados para identificar diferentes tipos de manipulacion documental. Estos modelos trabajan en conjunto para proporcionar un analisis comprehensivo que incluye la verificacion de consistencia visual, analisis de metadatos, deteccion de anomalias tipograficas, y comparacion con plantillas conocidas de documentos oficiales. El sistema genera un informe detallado con un puntaje de confianza y una lista de hallazgos especificos para cada documento analizado.
""", body_style))

detection_capabilities = [
    "<b>Deteccion de Manipulacion de Imagenes:</b> Identifica zonas modificadas mediante analisis de ruido, inconsistencias en niveles de compresion JPEG, deteccion de clonacion de areas, y analisis de bordes y transiciones anormales.",
    "<b>Analisis de Tipografia:</b> Compara fuentes utilizadas con bases de datos de fuentes oficiales, detectando inconsistencias en kerning, espaciado, tamano, y estilo tipografico que podrian indicar modificaciones.",
    "<b>Verificacion de Firmas:</b> Compara firmas manuscritas con registros biometricos almacenados, analizando presion, velocidad, y caracteristicas dinamicas cuando estan disponibles.",
    "<b>Deteccion de Impresion/Re-escaneo:</b> Identifica documentos que han sido impresos y re-escaneados para ocultar manipulaciones digitales originales, analizando patrones de medio-tono y artefactos de impresion.",
    "<b>Analisis de Metadatos:</b> Examina metadatos EXIF, propiedades del documento, historial de revisiones, y firmas digitales para detectar inconsistencias o ausencias sospechosas.",
    "<b>Verificacion de Elementos de Seguridad:</b> Detecta y valida marcas de agua, hologramas, microimpresion, tinta invisible, y otros elementos de seguridad en documentos que los contienen."
]

for cap in detection_capabilities:
    story.append(Paragraph(f"• {cap}", body_style))

story.append(Paragraph("<b>4.2 Proceso de Verificacion</b>", heading2_style))

story.append(Paragraph("""
El proceso de verificacion sigue un pipeline de analisis estructurado que garantiza una evaluacion exhaustiva del documento. Inicialmente, el sistema pre-procesa el documento para normalizar su formato y extraer caracteristicas relevantes. Posteriormente, multiples modelos especializados analizan diferentes aspectos del documento en paralelo. Finalmente, un modulo de decision integrado combina los resultados de todos los analizadores para generar un veredicto final con un nivel de confianza estadisticamente fundamentado.
""", body_style))

process_steps = [
    "<b>Paso 1 - Preprocesamiento:</b> Normalizacion de formato, correcion de rotacion, ajuste de contraste, y extraccion de regiones de interes.",
    "<b>Paso 2 - Extraccion de Caracteristicas:</b> Analisis de texturas, deteccion de bordes, extraccion de caracteristicas tipograficas, y segmentacion de elementos.",
    "<b>Paso 3 - Analisis Paralelo:</b> Ejecucion simultanea de modelos especializados en diferentes aspectos del documento.",
    "<b>Paso 4 - Fusion de Resultados:</b> Combinacion de resultados mediante tecnicas de ensemble learning para generar un veredicto unificado.",
    "<b>Paso 5 - Generacion de Informe:</b> Creacion de reporte detallado con visualizacion de hallazgos y recomendaciones."
]

for step in process_steps:
    story.append(Paragraph(f"• {step}", body_style))

story.append(Paragraph("<b>4.3 Tipos de Documentos Soportados</b>", heading2_style))

doc_types = [
    [Paragraph('<b>Categoria</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Tipos de Documento</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
     Paragraph('<b>Elementos Verificables</b>', ParagraphStyle(name='th', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER))],
    [Paragraph('Identidad', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Pasaportes, DNI, licencias, visas', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Fotos, firmas, hologramas, MRZ', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Educacion', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Titulos, certificados, diplomas', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Firmas, sellos, Registro oficial', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Financieros', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Estados de cuenta, facturas, contratos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Montos, fechas, firmas, logotipos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Legales', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Escrituras, poderes, sentencias', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Firmas, sellos, folios, registros', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
    [Paragraph('Corporativos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_CENTER)),
     Paragraph('Contratos, actas, certificados', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT)),
     Paragraph('Firmas, fechas, clausulas, logos', ParagraphStyle(name='tc', fontName='Times New Roman', fontSize=9, alignment=TA_LEFT))],
]

doc_table = Table(doc_types, colWidths=[1.2*inch, 2.3*inch, 2.3*inch])
doc_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(doc_table)
story.append(Spacer(1, 6))
story.append(Paragraph("<i>Tabla 3. Categorias de documentos soportados y elementos verificables</i>", ParagraphStyle(
    name='Caption', fontName='Times New Roman', fontSize=10, alignment=TA_CENTER, textColor=colors.grey)))

story.append(PageBreak())

# ===== SECTION 5: STACK TECNOLOGICO =====
story.append(Paragraph("<b>5. Stack Tecnologico Recomendado</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
La seleccion del stack tecnologico para DocuSentinel Pro prioriza la seguridad, escalabilidad, y mantenibilidad del sistema. Se recomienda utilizar tecnologias maduras con amplio soporte comunitario y un historial comprobado de seguridad. La arquitectura propuesta permite la sustitucion de componentes individuales sin afectar el resto del sistema, facilitando actualizaciones y migraciones futuras.
""", body_style))

story.append(Paragraph("<b>5.1 Frontend</b>", heading2_style))

frontend_tech = [
    "<b>Framework Principal:</b> Next.js 14+ con App Router, proporcionando renderizado del lado del servidor (SSR) para mayor seguridad y rendimiento, junto con generacion estatica donde sea apropiado.",
    "<b>UI Components:</b> shadcn/ui con Tailwind CSS para una interfaz moderna, accesible y consistente. Los componentes deben seguir los principios de diseno de Material Design o Fluent UI.",
    "<b>Estado Global:</b> Zustand para gestion de estado del cliente, con persistencia selectiva y sincronizacion con el servidor.",
    "<b>Visualizacion de Documentos:</b> PDF.js para renderizado de PDFs en el navegador, con soporte para anotaciones y visualizacion segura sin exposicion del contenido a JavaScript.",
    "<b>Comunicacion API:</b> TanStack Query (React Query) para cache y sincronizacion de datos con el backend."
]

for tech in frontend_tech:
    story.append(Paragraph(f"• {tech}", body_style))

story.append(Paragraph("<b>5.2 Backend</b>", heading2_style))

backend_tech = [
    "<b>API Server:</b> Node.js con Express o Fastify para endpoints REST, o NestJS para una arquitectura mas estructurada con inyeccion de dependencias.",
    "<b>Microservicios:</b> Python con FastAPI para el motor de verificacion de IA, aprovechando el ecosistema de machine learning de Python.",
    "<b>Autenticacion:</b> Implementacion personalizada con Passport.js, integrando JWT para sesiones stateless y OAuth2/OIDC para identidad federada.",
    "<b>Cola de Trabajos:</b> BullMQ con Redis para procesamiento asincrono de tareas pesadas como analisis de documentos y generacion de reportes.",
    "<b>WebSockets:</b> Socket.io para notificaciones en tiempo real y actualizaciones de estado de verificacion."
]

for tech in backend_tech:
    story.append(Paragraph(f"• {tech}", body_style))

story.append(Paragraph("<b>5.3 Base de Datos y Almacenamiento</b>", heading2_style))

db_tech = [
    "<b>Base de Datos Relacional:</b> PostgreSQL 15+ para datos estructurados como usuarios, permisos, metadatos de documentos y registros de auditoria. Utilizar Prisma como ORM para type-safety.",
    "<b>Base de Datos de Documentos:</b> MongoDB para almacenamiento de informes de verificacion y datos no estructurados provenientes del analisis de IA.",
    "<b>Cache:</b> Redis para cache de sesiones, rate limiting, y almacenamiento temporal de tokens de verificacion.",
    "<b>Almacenamiento de Objetos:</b> MinIO (autoalojado) o AWS S3 para almacenamiento de archivos cifrados, con versionado habilitado.",
    "<b>Busqueda:</b> Elasticsearch para indexacion y busqueda avanzada en logs de auditoria y metadatos de documentos."
]

for tech in db_tech:
    story.append(Paragraph(f"• {tech}", body_style))

story.append(PageBreak())

# ===== SECTION 6: REQUISITOS DE SEGURIDAD =====
story.append(Paragraph("<b>6. Requisitos de Seguridad</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
La seguridad es el pilar fundamental de DocuSentinel Pro. Todos los componentes del sistema deben implementar defensas en profundidad, asumiendo que cualquier capa individual puede ser comprometida. Los requisitos de seguridad descritos a continuacion son obligatorios y no negociables para el desarrollo del sistema.
""", body_style))

story.append(Paragraph("<b>6.1 Requisitos Criptograficos</b>", heading2_style))

crypto_reqs = [
    "Todos los documentos deben cifrarse con AES-256-GCM antes de almacenarse.",
    "Las claves de cifrado deben almacenarse en un HSM o gestor de secretos, nunca en codigo o bases de datos.",
    "Las contrasenas deben hashearse con Argon2id o bcrypt con un factor de trabajo minimo de 12.",
    "TLS 1.3 obligatorio para todas las comunicaciones externas; TLS 1.2 minimo para comunicaciones internas.",
    "Rotacion automatica de claves cada 90 dias como maximo.",
    "Implementacion de Perfect Forward Secrecy para todas las conexiones."
]

for req in crypto_reqs:
    story.append(Paragraph(f"• {req}", body_style))

story.append(Paragraph("<b>6.2 Requisitos de Aplicacion</b>", heading2_style))

app_reqs = [
    "Validacion estricta de entrada en todos los endpoints, utilizando schemas como Joi, Zod o JSON Schema.",
    "Proteccion contra OWASP Top 10: SQL Injection, XSS, CSRF, SSRF, Path Traversal, etc.",
    "Rate limiting granular por usuario, IP y endpoint.",
    "Sanitizacion de nombres de archivo para prevenir Path Traversal.",
    "Limite de tamano de archivo configurable, con rechazo de archivos que excedan el limite.",
    "Escaneo de malware automatico para todos los archivos subidos utilizando motores como ClamAV.",
    "Content Security Policy (CSP) estricto en el frontend.",
    "Headers de seguridad HTTP: HSTS, X-Frame-Options, X-Content-Type-Options, etc."
]

for req in app_reqs:
    story.append(Paragraph(f"• {req}", body_style))

story.append(Paragraph("<b>6.3 Requisitos de Infraestructura</b>", heading2_style))

infra_reqs = [
    "Despliegue en contenedores Docker con imagenes minimas (Alpine/Distroless).",
    "Escaneo de vulnerabilidades en imagenes de contenedor con Trivy o Clair.",
    "Network policies para segmentacion de red entre microservicios.",
    "Secrets management con Kubernetes Secrets, HashiCorp Vault o equivalente.",
    "Logging centralizado con retencion minima de 1 ano para logs de auditoria.",
    "Backup cifrado y geograficamente distribuido con pruebas de restauracion periodicas.",
    "Monitoreo de seguridad con alertas en tiempo real para eventos sospechosos."
]

for req in infra_reqs:
    story.append(Paragraph(f"• {req}", body_style))

story.append(PageBreak())

# ===== SECTION 7: PROMPT COMPLETO =====
story.append(Paragraph("<b>7. Prompt Completo para Sistema Multiagente</b>", heading1_style))
story.append(Spacer(1, 8))

story.append(Paragraph("""
A continuacion se presenta el prompt integral disenado para ser procesado por un sistema multiagente de IA. Este prompt contiene todas las especificaciones necesarias para desarrollar DocuSentinel Pro como una aplicacion lista para produccion.
""", body_style))

story.append(Spacer(1, 12))

# Prompt box
prompt_text = """
<b>=== PROMPT PARA SISTEMA MULTIAGENTE DE IA ===</b><br/><br/>

<b>NOMBRE DEL PROYECTO:</b> DocuSentinel Pro<br/><br/>

<b>DESCRIPCION GENERAL:</b><br/>
Desarrolla una aplicacion web profesional de Gestion Integral de Documentos con dos modulos principales:<br/><br/>

<b>MODULO 1 - CONTROL DE ACCESO Y AUDITORIA:</b><br/>
Implementa un sistema de seguridad documental que incluya:<br/>
1. Sistema de encriptacion hibrido AES-256-GCM + RSA-4096 para cifrado de documentos<br/>
2. Autenticacion multifactor (MFA) obligatoria con soporte TOTP, FIDO2/WebAuthn y SMS<br/>
3. Control de acceso basado en roles (RBAC) con niveles: Super Admin, Admin Documentos, Auditor, Verificador, Usuario Estandar<br/>
4. Sistema de auditoria inmutable con registro de: usuario, operacion, fecha/hora, IP, dispositivo, resultado<br/>
5. Logs encadenados criptograficamente para garantizar integridad del historial<br/>
6. Notificaciones en tiempo real de accesos y operaciones sensibles<br/><br/>

<b>MODULO 2 - VERIFICACION DE AUTENTICIDAD:</b><br/>
Implementa un motor de verificacion documental con IA que incluya:<br/>
1. Deteccion de manipulacion de imagenes (analisis de ruido, compresion JPEG, clonacion)<br/>
2. Analisis tipografico para detectar inconsistencias en fuentes y formato<br/>
3. Verificacion de firmas manuscritas mediante comparacion biometrica<br/>
4. Deteccion de documentos impresos y re-escaneados<br/>
5. Analisis de metadatos EXIF y propiedades del documento<br/>
6. Verificacion de elementos de seguridad (marcas de agua, hologramas, microimpresion)<br/>
7. Soporte para: documentos de identidad, certificados academicos, documentos financieros, contratos legales<br/>
8. Generacion de informes detallados con puntaje de confianza y hallazgos especificos<br/><br/>

<b>STACK TECNOLOGICO REQUERIDO:</b><br/>
Frontend: Next.js 14+ con App Router, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query<br/>
Backend: Node.js/Express o NestJS para API, Python/FastAPI para motor de IA<br/>
Base de datos: PostgreSQL (Prisma ORM), MongoDB, Redis<br/>
Almacenamiento: MinIO o AWS S3 con encriptacion del lado del servidor<br/>
Seguridad: JWT, OAuth2, Passport.js, Helmet, rate-limit<br/>
IA/ML: TensorFlow, PyTorch, OpenCV para analisis de documentos<br/><br/>

<b>REQUISITOS DE SEGURIDAD OBLIGATORIOS:</b><br/>
1. Encriptacion AES-256-GCM para todos los documentos en reposo<br/>
2. TLS 1.3 para todas las comunicaciones<br/>
3. HSM o Vault para almacenamiento de claves<br/>
4. Validacion estricta de entrada en todos los endpoints<br/>
5. Proteccion contra OWASP Top 10<br/>
6. Rate limiting por usuario, IP y endpoint<br/>
7. Escaneo de malware automatico para uploads<br/>
8. CSP estricto y headers de seguridad HTTP<br/><br/>

<b>REQUISITOS DE UI/UX:</b><br/>
1. Dashboard principal con metricas de seguridad y actividad reciente<br/>
2. Vista de documentos con control de acceso granular<br/>
3. Visualizador de documentos seguro (sin descarga si no esta autorizado)<br/>
4. Panel de auditoria con filtros y exportacion<br/>
5. Interfaz de verificacion con upload drag-and-drop<br/>
6. Reportes de verificacion con visualizacion de hallazgos<br/>
7. Administracion de usuarios y permisos<br/>
8. Configuracion del sistema y politicas de seguridad<br/>
9. Diseno responsive para desktop y tablet<br/>
10. Tema profesional con paleta de colores azul marino y dorado<br/><br/>

<b>ARQUITECTURA:</b><br/>
Implementar arquitectura de microservicios con los siguientes componentes:<br/>
- API Gateway (autenticacion, routing, rate limiting)<br/>
- Auth Service (identidad, MFA, permisos)<br/>
- Document Service (CRUD, encriptacion, versionado)<br/>
- Verification Engine (analisis de IA, generacion de informes)<br/>
- Audit Service (logs, trazabilidad, reportes)<br/>
- Notification Service (alertas, emails, websockets)<br/><br/>

<b>ENTREGABLES ESPERADOS:</b><br/>
1. Codigo fuente completo y documentado<br/>
2. Esquemas de base de datos con migraciones<br/>
3. API documentada con OpenAPI/Swagger<br/>
4. Tests unitarios y de integracion<br/>
5. Configuracion de Docker y docker-compose<br/>
6. Pipeline CI/CD basico<br/>
7. Documentacion de despliegue<br/>
8. Manual de usuario<br/><br/>

<b>NIVEL DE CALIDAD:</b> Produccion-ready con mejores practicas de la industria<br/>
<b>LENGUAJE:</b> Espanol para UI y documentacion, Ingles para codigo y comentarios tecnicos<br/>
"""

story.append(Paragraph(prompt_text, ParagraphStyle(
    name='PromptBox',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    backColor=colors.HexColor('#F8F8F8'),
    borderPadding=12,
    borderWidth=1,
    borderColor=colors.HexColor('#1F4E79')
)))

# Build PDF
doc.build(story)
print("PDF generated successfully!")
