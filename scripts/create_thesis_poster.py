from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "PAU_Market_Tez_Posteri.pptx"

# Template-inspired palette from the provided GBYF sample poster.
DARK_BLUE = RGBColor(31, 78, 121)
HEADER_BLUE = RGBColor(32, 82, 128)
MID_BLUE = RGBColor(45, 91, 139)
LIGHT_BLUE = RGBColor(217, 230, 242)
PAGE_WHITE = RGBColor(255, 255, 255)
PANEL_GRAY = RGBColor(217, 217, 217)
PANEL_LIGHT = RGBColor(239, 239, 239)
BORDER = RGBColor(142, 169, 219)
BLACK = RGBColor(0, 0, 0)
TEXT = RGBColor(20, 20, 20)
RED = RGBColor(220, 38, 38)


def inch(value: float):
    return Inches(value)


def set_font(run, size=11, bold=False, color=TEXT, name="Arial"):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_rect(slide, x, y, w, h, fill=PAGE_WHITE, line=BLACK, width=0.75):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, inch(x), inch(y), inch(w), inch(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line
    shape.line.width = Pt(width)
    return shape


def add_text(slide, text, x, y, w, h, size=11, bold=False, color=TEXT, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(inch(x), inch(y), inch(w), inch(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.alignment = align
    p.text = text
    set_font(p.runs[0], size=size, bold=bold, color=color)
    return box


def add_paragraph_box(slide, lines, x, y, w, h, size=9.5, leading=1.05):
    box = slide.shapes.add_textbox(inch(x), inch(y), inch(w), inch(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = inch(0.04)
    tf.margin_right = inch(0.04)
    tf.margin_top = inch(0.02)
    for idx, line in enumerate(lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = line
        p.space_after = Pt(4 * leading)
        set_font(p.runs[0], size=size, bold=False, color=TEXT)
    return box


def add_section(slide, title, lines, x, y, w, h, body_size=9.3):
    add_rect(slide, x, y, w, h, fill=PANEL_LIGHT, line=BORDER, width=0.6)
    add_rect(slide, x, y, w, 0.45, fill=DARK_BLUE, line=DARK_BLUE, width=0.4)
    add_text(slide, title, x + 0.05, y + 0.075, w - 0.1, 0.28, size=13, bold=True, color=PAGE_WHITE, align=PP_ALIGN.CENTER)
    add_paragraph_box(slide, lines, x + 0.15, y + 0.62, w - 0.3, h - 0.75, size=body_size)


def add_table(slide, x, y, w, h):
    rows, cols = 6, 3
    table_shape = slide.shapes.add_table(rows, cols, inch(x), inch(y), inch(w), inch(h))
    table = table_shape.table
    table.columns[0].width = inch(w * 0.37)
    table.columns[1].width = inch(w * 0.23)
    table.columns[2].width = inch(w * 0.40)

    values = [
        ["Metrik", "Durum", "Açıklama"],
        ["Precision@5", "Pilot sonrası", "İlk 5 önerinin isabeti"],
        ["HitRate@5", "Pilot sonrası", "İlk 5'te en az 1 doğru öneri"],
        ["Recall@5", "Pilot sonrası", "İlgili ilanları yakalama oranı"],
        ["NDCG@5", "Pilot sonrası", "Doğru önerinin sıralamadaki yeri"],
        ["RMSE", "Pilot sonrası", "Etkileşim ağırlığı tahmin hatası"],
    ]

    for r, row in enumerate(values):
        for c, text in enumerate(row):
            cell = table.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = DARK_BLUE if r == 0 else (RGBColor(248, 248, 248) if r % 2 else PAGE_WHITE)
            p = cell.text_frame.paragraphs[0]
            p.text = text
            set_font(p.runs[0], size=7.8, bold=(r == 0 or c == 0), color=PAGE_WHITE if r == 0 else TEXT)


def add_university_seal(slide, x, y, size):
    outer = slide.shapes.add_shape(MSO_SHAPE.OVAL, inch(x), inch(y), inch(size), inch(size))
    outer.fill.solid()
    outer.fill.fore_color.rgb = PAGE_WHITE
    outer.line.color.rgb = DARK_BLUE
    outer.line.width = Pt(1.5)

    inner = slide.shapes.add_shape(MSO_SHAPE.OVAL, inch(x + 0.17), inch(y + 0.17), inch(size - 0.34), inch(size - 0.34))
    inner.fill.solid()
    inner.fill.fore_color.rgb = LIGHT_BLUE
    inner.line.color.rgb = DARK_BLUE
    inner.line.width = Pt(0.8)

    add_text(slide, "PAÜ", x + 0.22, y + 0.36, size - 0.44, 0.35, size=12, bold=True, color=DARK_BLUE, align=PP_ALIGN.CENTER)
    add_text(slide, "DENİZLİ", x + 0.18, y + 0.72, size - 0.36, 0.25, size=6.7, bold=True, color=DARK_BLUE, align=PP_ALIGN.CENTER)


def add_gbyf_mark(slide, x, y):
    logo = slide.shapes.add_shape(MSO_SHAPE.OVAL, inch(x), inch(y), inch(0.8), inch(0.8))
    logo.fill.solid()
    logo.fill.fore_color.rgb = RGBColor(180, 40, 40)
    logo.line.color.rgb = RGBColor(235, 235, 235)
    logo.line.width = Pt(1.5)
    add_text(slide, "GBYF", x + 0.08, y + 0.27, 0.64, 0.22, size=6.6, bold=True, color=PAGE_WHITE, align=PP_ALIGN.CENTER)


def build_poster():
    prs = Presentation()
    # A1 portrait ratio: 594 x 841 mm.
    prs.slide_width = inch(23.39)
    prs.slide_height = inch(33.11)

    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Full white poster page.
    add_rect(slide, 0, 0, 23.39, 33.11, fill=PAGE_WHITE, line=PAGE_WHITE, width=0)

    page_x = 1.0
    page_y = 0.85
    page_w = 21.4
    page_h = 31.15

    # Poster page frame.
    add_rect(slide, page_x, page_y, page_w, page_h, fill=PAGE_WHITE, line=RGBColor(210, 210, 210), width=0.8)

    # Header: university, project name, team, project code box.
    header_y = page_y + 0.15
    header_h = 3.85
    add_rect(slide, page_x + 0.05, header_y, page_w - 0.1, header_h, fill=HEADER_BLUE, line=HEADER_BLUE, width=0.6)
    add_university_seal(slide, page_x + 0.32, header_y + 0.22, 1.45)

    project_box = add_rect(slide, page_x + page_w - 4.6, header_y, 4.55, 0.82, fill=PAGE_WHITE, line=PAGE_WHITE, width=0.4)
    project_box.text_frame.clear()
    p = project_box.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "GBYF Proje No"
    set_font(p.runs[0], size=14, bold=True, color=BLACK)
    project_box.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    add_text(slide, "[Proje No]", page_x + page_w - 3.85, header_y + 0.45, 3.1, 0.25, size=8.2, bold=True, color=BLACK, align=PP_ALIGN.CENTER)

    add_text(slide, "Pamukkale Üniversitesi", page_x + 3.3, header_y + 0.28, 14.3, 0.48, size=17, bold=True, color=PAGE_WHITE, align=PP_ALIGN.CENTER)
    add_text(
        slide,
        "PAÜ Market: Kampüs İçi Akıllı İkinci El Pazar Yeri",
        page_x + 2.25,
        header_y + 1.05,
        16.9,
        0.98,
        size=22,
        bold=True,
        color=PAGE_WHITE,
        align=PP_ALIGN.CENTER,
    )
    add_text(
        slide,
        "Hasan Toğmuş, Berke  --  Danışman: [Danışman Öğretim Üyesi]",
        page_x + 2.2,
        header_y + 2.42,
        17.0,
        0.42,
        size=10.6,
        bold=True,
        color=PAGE_WHITE,
        align=PP_ALIGN.CENTER,
    )
    add_text(
        slide,
        "Bilgisayar Mühendisliği Bitirme Projesi",
        page_x + 2.2,
        header_y + 2.95,
        17.0,
        0.34,
        size=9.3,
        bold=True,
        color=RGBColor(230, 238, 247),
        align=PP_ALIGN.CENTER,
    )

    # Main content gray area.
    content_y = header_y + header_h + 0.25
    content_h = 24.55
    add_rect(slide, page_x + 0.35, content_y, page_w - 0.7, content_h, fill=PANEL_GRAY, line=BLACK, width=0.9)

    left_x = page_x + 0.62
    right_x = page_x + 10.98
    col_w = 9.6
    gutter_x = page_x + 10.58
    add_rect(slide, gutter_x, content_y + 0.15, 0.18, content_h - 0.3, fill=PAGE_WHITE, line=PAGE_WHITE, width=0)

    add_section(
        slide,
        "Proje Özeti",
        [
            "PAÜ Market, Pamukkale Üniversitesi öğrencilerine özel kapalı bir C2C ikinci el pazar yeri uygulamasıdır.",
            "Sistem; okul e-postasıyla doğrulanan kullanıcıların ilan eklemesini, ilanları keşfetmesini, favorilemesini, satıcıyla mesajlaşmasını ve anlaşma isteği göndermesini sağlar.",
            "Tezin teknik odağı, bu etkileşimlerden öğrenerek kişiselleştirilmiş ilan önerileri üreten hibrit öneri sistemidir.",
        ],
        left_x,
        content_y + 0.25,
        col_w,
        3.95,
        body_size=8.6,
    )

    add_section(
        slide,
        "Problem ve Amaç",
        [
            "Genel e-ticaret platformları öğrenciler için güven ve kampüs içi erişim problemini tam çözmemektedir.",
            "Bu projede amaç; sadece PAÜ öğrencilerine açık, doğrulanmış, moderasyon destekli ve kullanıcı davranışlarından öğrenebilen bir pazar yeri geliştirmektir.",
            "Platformun ana hedefleri: güvenli kullanıcı doğrulama, ilan yönetimi, mesajlaşma, anlaşma/satış kaydı ve kişiselleştirilmiş önerilerdir.",
        ],
        left_x,
        content_y + 4.55,
        col_w,
        4.25,
        body_size=8.5,
    )

    add_section(
        slide,
        "Kullanılan Teknolojiler",
        [
            "Frontend: React + Vite ile responsive kullanıcı arayüzü.",
            "Backend: ASP.NET Core Web API, JWT tabanlı kimlik doğrulama ve servis katmanı.",
            "Veritabanı: MSSQL + Entity Framework Core.",
            "Öneri Servisi: Python + FastAPI mikroservisi.",
            "DevOps: Docker Compose ile frontend, backend, SQL ve recommender servisleri birlikte çalıştırılır.",
        ],
        left_x,
        content_y + 9.15,
        col_w,
        4.55,
        body_size=8.25,
    )

    add_section(
        slide,
        "Sistem Mimarisi",
        [
            "Kullanıcı davranışları frontend üzerinden backend'e iletilir ve Interaction tablosuna kaydedilir.",
            "Backend; ilan, kullanıcı, mesaj, favori, anlaşma ve satış süreçlerini yönetir.",
            "Recommender servisi eğitim sırasında PAÜ Market etkileşim export'unu kullanır; öneri sırasında backend'e gerçek Listing.Id değerleri döner.",
            "Backend önerileri tekrar doğrular: onaylı, aktif, satılmamış ve gösterilebilir ilanlar kullanıcıya sunulur.",
        ],
        left_x,
        content_y + 14.05,
        col_w,
        5.05,
        body_size=8.25,
    )

    add_section(
        slide,
        "Platform Özellikleri",
        [
            "• PAÜ e-posta doğrulamalı kayıt ve giriş",
            "• Şifre sıfırlama ve profil yönetimi",
            "• Çoklu fotoğraflı ilan oluşturma",
            "• Favori, mesajlaşma ve anlaşma isteği",
            "• Satıldı akışı, alıcı kaydı ve satıcı değerlendirme",
            "• Admin paneli ve ilan moderasyonu",
        ],
        left_x,
        content_y + 19.45,
        col_w,
        4.85,
        body_size=8.4,
    )

    add_section(
        slide,
        "Öneri Sistemi",
        [
            "Öneri sistemi, kullanıcı-ilan etkileşimlerini implicit feedback olarak yorumlar. Her davranış kullanıcı ilgisinin farklı seviyesini temsil eder.",
            "Etkileşim ağırlıkları: görüntüleme=1.0, mesaj=2.0, favori=3.0, anlaşma isteği=4.0, kabul=4.5, satın alma/satıldı=5.0.",
            "Matris yapısı R[u, i] şeklindedir: satırlar kullanıcıları, sütunlar ilanları, hücreler ise ilgi gücünü temsil eder.",
            "LightFM tabanlı hibrit yaklaşım collaborative sinyalleri kategori/içerik özellikleriyle birleştirir. Cold-start durumunda kategori, onboarding ve popüler/yeni ilan fallback'i kullanılır.",
        ],
        right_x,
        content_y + 0.25,
        col_w,
        6.05,
        body_size=8.3,
    )

    add_section(
        slide,
        "Pilot Veri Planı",
        [
            "Tez sunumu öncesinde küçük ölçekli gerçek kampüs pilotu yapılacaktır.",
            "Planlanan veri: 30-50 ilan, 10-20 PAÜ öğrencisi, kişi başı 10-20 etkileşim.",
            "Her kullanıcı kendi okul e-postasıyla giriş yapacak; ilan görüntüleme, favori, mesaj ve anlaşma isteği gibi gerçek davranışlar bırakacaktır.",
            "Amaç sentetik veri üretmek değil, gerçek öğrencilerden kontrollü ve açıklanabilir pilot veri toplamaktır.",
        ],
        right_x,
        content_y + 6.65,
        col_w,
        4.55,
        body_size=8.2,
    )

    add_section(
        slide,
        "Değerlendirme Yaklaşımı",
        [
            "Bu sistem klasik sınıflandırma problemi olmadığı için tek başına accuracy metriği kullanılmaz.",
            "Recommender sistemlerde Top-N sıralama metrikleri daha uygundur: Precision@5, Recall@5, HitRate@5, NDCG@5 ve RMSE.",
            "Pilot veri toplandıktan sonra model PAÜ Market verisiyle yeniden eğitilecek ve metrikler bu alana işlenecektir.",
        ],
        right_x,
        content_y + 11.55,
        col_w,
        3.75,
        body_size=8.25,
    )
    add_table(slide, right_x + 0.2, content_y + 15.55, col_w - 0.4, 3.0)

    add_section(
        slide,
        "Beklenen Sonuç ve Katkılar",
        [
            "PAÜ Market, kampüs içinde güvenli ve doğrulanmış ikinci el alışveriş ortamı sunar.",
            "Mesajlaşma ve anlaşma akışı sayesinde sadece tıklama değil, gerçek satın alma niyeti de veri olarak toplanır.",
            "Öneri sistemi kullanıcıların ilgi alanlarına göre ilanları sıralayarak keşif sürecini kolaylaştırır.",
            "Mikroservis mimarisi, öneri modelini ana backend'den ayırarak ölçeklenebilir ve sürdürülebilir bir yapı sağlar.",
        ],
        right_x,
        content_y + 18.95,
        col_w,
        5.35,
        body_size=8.25,
    )

    # Footer matching the provided template style.
    footer_y = page_y + page_h - 1.55
    add_gbyf_mark(slide, page_x + 4.25, footer_y + 0.25)
    add_text(slide, "Genç Beyinler Yeni Fikirler", page_x + 5.25, footer_y + 0.12, 11.2, 0.38, size=12, bold=True, color=BLACK, align=PP_ALIGN.CENTER)
    add_text(slide, "Proje Pazarı ve Bitirme Projeleri Ortak Sergisi", page_x + 5.25, footer_y + 0.62, 11.2, 0.32, size=9.2, bold=False, color=BLACK, align=PP_ALIGN.CENTER)

    prs.save(OUTPUT)
    print(f"Poster saved: {OUTPUT}")


if __name__ == "__main__":
    build_poster()
