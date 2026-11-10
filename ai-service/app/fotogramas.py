"""Fotogramas y miniaturas de cada res, sacados en el servidor con ffmpeg.

El navegador no siempre puede leer el video del dron (muchos drones graban en H.265/HEVC,
que Chrome en Windows no decodifica). Aquí se usa el ffmpeg que trae imageio-ffmpeg, así
no hace falta instalar nada en el sistema."""
import base64
import io
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont

try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # sin ffmpeg el censo sigue; solo no hay fotograma del servidor
    FFMPEG = None

LADO_FOTOGRAMA = 1600   # px del fotograma que se devuelve para la captura
LADO_MINIATURA = 160    # px de cada miniatura de res
LADO_ANALISIS = 1280    # px de los fotogramas que se envían a la IA
MAX_CUADROS_ANALISIS = 40  # fotogramas del vuelo que se envían a la IA como mucho


def fotograma_de_video(ruta, segundo, lado=LADO_FOTOGRAMA):
    """Imagen PIL del instante `segundo` del video, o None si no se pudo leer."""
    if not FFMPEG:
        return None
    for seg in (max(0.0, segundo), max(0.0, segundo - 0.5), 0.0):
        try:
            salida = subprocess.run(
                [FFMPEG, "-v", "error", "-ss", f"{seg:.2f}", "-i", ruta, "-frames:v", "1",
                 "-vf", f"scale='min({lado},iw)':-2", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "3", "-"],
                capture_output=True, timeout=60, check=False,
            ).stdout
            if salida:
                return Image.open(io.BytesIO(salida)).convert("RGB")
        except (OSError, subprocess.SubprocessError, ValueError):
            continue
    return None


def duracion_de_video(ruta):
    """Segundos del video según ffmpeg, o None."""
    if not FFMPEG:
        return None
    try:
        info = subprocess.run([FFMPEG, "-i", ruta], capture_output=True, text=True, timeout=30).stderr
    except (OSError, subprocess.SubprocessError):
        return None
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", info)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else None


def muestrear_video(ruta, max_cuadros=MAX_CUADROS_ANALISIS, lado=LADO_ANALISIS):
    """Fotogramas repartidos a lo largo del vuelo: [(segundo, imagen PIL)], como mucho
    `max_cuadros`, uno por segundo en videos cortos. Lista vacía si no se pudo leer."""
    duracion = duracion_de_video(ruta)
    if not duracion or duracion <= 0:
        return []
    paso = max(1.0, duracion / max_cuadros)
    try:
        salida = subprocess.run(
            [FFMPEG, "-v", "error", "-i", ruta, "-vf", f"fps=1/{paso:.3f},scale='min({lado},iw)':-2",
             "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "4", "-"],
            capture_output=True, timeout=300, check=False,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    cuadros = []
    for i, jpg in enumerate(partir_jpegs(salida)[:max_cuadros]):
        try:
            cuadros.append((round(i * paso + paso / 2, 1) if paso > 1 else float(i), Image.open(io.BytesIO(jpg)).convert("RGB")))
        except (OSError, ValueError):
            continue
    return cuadros


def partir_jpegs(datos):
    """Separa los JPG seguidos que entrega ffmpeg por la tubería (de FFD8 a FFD9)."""
    partes, inicio = [], datos.find(b"\xff\xd8")
    while inicio >= 0:
        fin = datos.find(b"\xff\xd9", inicio + 2)
        if fin < 0:
            break
        partes.append(datos[inicio:fin + 2])
        inicio = datos.find(b"\xff\xd8", fin + 2)
    return partes


def con_numero(img, k):
    """Copia del fotograma con su número escrito en la esquina superior izquierda. Con solo
    la etiqueta de texto la IA a veces asociaba cada etiqueta a la imagen anterior y sus
    recuadros quedaban corridos un fotograma."""
    copia = img.copy()
    dib = ImageDraw.Draw(copia)
    tam = max(16, copia.width // 40)
    try:
        fuente = ImageFont.load_default(size=tam)
    except TypeError:  # Pillow antiguo sin tamaño de fuente
        fuente = ImageFont.load_default()
    texto = f"Fotograma {k}"
    x0, y0, x1, y1 = dib.textbbox((0, 0), texto, font=fuente)
    pad = tam // 3
    dib.rectangle([0, 0, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad], fill=(0, 0, 0))
    dib.text((pad - x0, pad - y0), texto, fill=(255, 255, 255), font=fuente)
    return copia


def a_jpeg(img, calidad=80):
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=calidad, optimize=True)
    return buf.getvalue()


def imagen_de_archivo(datos):
    try:
        img = Image.open(io.BytesIO(datos)).convert("RGB")
        img.thumbnail((LADO_FOTOGRAMA, LADO_FOTOGRAMA))
        return img
    except (OSError, ValueError):
        return None


def a_data_url(img, calidad=82):
    return "data:image/jpeg;base64," + base64.b64encode(a_jpeg(img, calidad)).decode("ascii")


def miniatura(img, caja, margen=0.35):
    """Recorte cuadrado alrededor del recuadro [ymin, xmin, ymax, xmax] (0-1000), con margen
    para que la res quede completa aunque el recuadro no sea exacto."""
    if img is None or not caja:
        return None
    ymin, xmin, ymax, xmax = caja
    w, h = img.size
    cx, cy = (xmin + xmax) / 2000 * w, (ymin + ymax) / 2000 * h
    lado = max((xmax - xmin) / 1000 * w, (ymax - ymin) / 1000 * h) * (1 + 2 * margen)
    lado = max(lado, min(w, h) * 0.06)
    x0, y0 = max(0, cx - lado / 2), max(0, cy - lado / 2)
    x1, y1 = min(w, x0 + lado), min(h, y0 + lado)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    recorte = img.crop((int(x0), int(y0), int(x1), int(y1)))
    recorte.thumbnail((LADO_MINIATURA, LADO_MINIATURA))
    return a_data_url(recorte, calidad=72)


def miniaturas_de_reses(reses, cuadros):
    """Agrega "miniatura" a cada res recortándola del fotograma exacto en que la IA la marcó
    (`cuadros`: lista de imágenes en el orden en que se enviaron). Modifica la lista."""
    for r in reses:
        k = r.get("cuadro")
        img = cuadros[k] if isinstance(k, int) and 0 <= k < len(cuadros) else None
        r["miniatura"] = miniatura(img, r.get("caja"))
