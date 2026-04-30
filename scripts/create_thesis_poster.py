from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "PAU_Market_Tez_Posteri.pptx"

BLUE = RGBColor(37, 99, 235)
NAVY = RGBColor(15, 23, 42)
SLATE = RGBColor(71, 85, 105)
MUTED = RGBColor(100, 116, 139)
LIGHT = RGBColor(248, 250, 252)
PANEL = RGBColor(255, 255, 255)
BORDER = RGBColor(203, 213, 225)
TEAL = RGBColor(13, 148, 136)
CYAN = RGBColor(14, 116, 144)
GREEN = RGBColor(22, 163, 74)
AMBER = RGBColor(217, 119, 6)
RED = RGBColor(220, 38, 38)
SOFT_BLUE = RGBColor(219, 234, 254)
SOFT_TEAL = RGBColor(204, 251, 241)
SOFT_AMBER = RGBColor(254, 243, 199)


def inches(value: float):
    return Inches(value)


def set_font(run, size=20, bold=False, color=NAVY, font="Aptos"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_box(slide, x, y, w, h, fill=PANEL, line=BORDER, radius=True):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    box = slide.shapes.add_shape(shape_type, inches(x), inches(y), inches(w), inches(h))
    box.fill.solid()
    box.fill.fore_color.rgb = fill
    box.line.color.rgb = line
    box.line.width = Pt(1.2)
    return box


def add_text(slide, text, x, y, w, h, size=20, bold=False, color=NAVY, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(inches(x), inches(y), inches(w), inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.alignment = align
    p.text = text
    set_font(p.runs[0], size=size, bold=bold, color=color)
    return box


def add_card(slide, title, body, x, y, w, h, accent=BLUE, title_size=20, body_size=14):
    add_box(slide, x, y, w, h)
    accent_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, inches(x), inches(y), inches(0.13), inches(h))
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = accent
    accent_bar.line.color.rgb = accent
    add_text(slide, title, x + 0.35, y + 0.22, w - 0.55, 0.42, size=title_size, bold=True, color=NAVY)

    box = slide.shapes.add_textbox(inches(x + 0.35), inches(y + 0.8), inches(w - 0.55), inches(h - 1.0))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    for idx, line in enumerate(body):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = line
        p.space_after = Pt(5)
        set_font(p.runs[0], size=body_size, bold=False, color=SLATE)
    return box


def add_badge(slide, text, x, y, w, color=BLUE, fill=SOFT_BLUE):
    shape = add_box(slide, x, y, w, 0.46, fill=fill, line=fill)
    shape.text_frame.clear()
    p = shape.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = text
    set_font(p.runs[0], size=13, bold=True, color=color)
    return shape


def add_logo(slide, x, y):
    logo = add_box(slide, x, y, 1.45, 1.45, fill=RGBColor(255, 255, 255), line=SOFT_BLUE)
    logo.text_frame.clear()
    p = logo.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = "PM"
    set_font(run, size=26, bold=True, color=BLUE, font="Georgia")
    logo.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    return logo


def add_flow(slide, x, y, labels):
    box_w = 4.1
    gap = 0.45
    for i, label in enumerate(labels):
        bx = x + i * (box_w + gap)
        add_box(slide, bx, y, box_w, 1.05, fill=RGBColor(241, 245, 249), line=SOFT_BLUE)
        add_text(slide, label, bx + 0.15, y + 0.22, box_w - 0.3, 0.62, size=13.5, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
        if i < len(labels) - 1:
            add_text(slide, "→", bx + box_w + 0.06, y + 0.2, gap - 0.1, 0.6, size=24, bold=True, color=BLUE, align=PP_ALIGN.CENTER)


def add_metric_table(slide, x, y, w, h):
    rows, cols = 6, 3
    table_shape = slide.shapes.add_table(rows, cols, inches(x), inches(y), inches(w), inches(h))
    table = table_shape.table
    table.columns[0].width = inches(w * 0.44)
    table.columns[1].width = inches(w * 0.22)
    table.columns[2].width = inches(w * 0.34)

    headers = ["Ölçüm", "Durum", "Poster Notu"]
    data = [
        ["Pilot kullanıcı", "10-20", "Gerçek PAÜ öğrencisi"],
        ["İlan sayısı", "30-50", "Kategori dengeli"],
        ["Etkileşim", "150-400+", "view/favorite/message/deal"],
        ["Precision@5 / HitRate@5", "Pilot sonrası", "Accuracy yerine Top-N"],
        ["RMSE / NDCG@5", "Pilot sonrası", "Model değerlendirme"],
    ]

    for col, text in enumerate(headers):
        cell = table.cell(0, col)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        p = cell.text_frame.paragraphs[0]
        p.text = text
        set_font(p.runs[0], size=12.5, bold=True, color=RGBColor(255, 255, 255))

    for row, values in enumerate(data, start=1):
        for col, text in enumerate(values):
            cell = table.cell(row, col)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(248, 250, 252) if row % 2 == 1 else RGBColor(255, 255, 255)
            p = cell.text_frame.paragraphs[0]
            p.text = text
            set_font(p.runs[0], size=11.2, bold=(col == 0), color=NAVY if col == 0 else SLATE)


def build_poster():
    prs = Presentation()
    prs.slide_width = inches(48)
    prs.slide_height = inches(36)
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Background
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = LIGHT
    bg.line.color.rgb = LIGHT

    # Header
    header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, inches(4.25))
    header.fill.solid()
    header.fill.fore_color.rgb = NAVY
    header.line.color.rgb = NAVY
    deco = slide.shapes.add_shape(MSO_SHAPE.OVAL, inches(39.5), inches(-2.2), inches(9.5), inches(9.5))
    deco.fill.solid()
    deco.fill.fore_color.rgb = RGBColor(30, 64, 175)
    deco.line.color.rgb = RGBColor(30, 64, 175)
    deco2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, inches(35.8), inches(1.15), inches(5.2), inches(5.2))
    deco2.fill.solid()
    deco2.fill.fore_color.rgb = RGBColor(15, 118, 110)
    deco2.line.color.rgb = RGBColor(15, 118, 110)

    add_logo(slide, 1.05, 0.75)
    add_text(slide, "PAÜ Market", 2.75, 0.65, 6.5, 0.6, size=28, bold=True, color=RGBColor(255, 255, 255))
    add_text(
        slide,
        "Pamukkale Üniversitesi Öğrencilerine Özel Akıllı İkinci El Pazar Yeri",
        2.75,
        1.25,
        28.5,
        1.05,
        size=27,
        bold=True,
        color=RGBColor(255, 255, 255),
    )
    add_text(
        slide,
        "PAÜ e-posta doğrulamalı güvenli kampüs pazarı • Mesajlaşma ve anlaşma akışı • Kullanıcı etkileşimlerinden öğrenen hibrit öneri sistemi",
        2.78,
        2.35,
        31,
        0.55,
        size=14.2,
        color=RGBColor(226, 232, 240),
    )
    add_badge(slide, "Hazırlayanlar: Hasan Toğmuş ve Berke", 2.75, 3.08, 7.9, color=RGBColor(255, 255, 255), fill=RGBColor(37, 99, 235))
    add_badge(slide, "Danışman: [Danışman Öğretim Üyesi]", 11.0, 3.08, 7.9, color=RGBColor(255, 255, 255), fill=RGBColor(15, 118, 110))
    add_badge(slide, "Bilgisayar Mühendisliği Bitirme Projesi", 19.25, 3.08, 8.3, color=NAVY, fill=SOFT_AMBER)

    # Column coordinates
    left_x, mid_x, right_x = 1.1, 16.55, 32.0
    col_w = 14.45
    y0 = 5.0

    add_card(
        slide,
        "1. Problem ve Amaç",
        [
            "• Öğrenciler kampüs içinde ikinci el ürün alıp satarken güven, iletişim ve doğrulama problemi yaşıyor.",
            "• Genel pazar yeri uygulamaları PAÜ öğrencilerine özel değildir; kullanıcı güveni ve kampüs bağlamı zayıftır.",
            "• Amaç: PAÜ e-postasıyla doğrulanan, ilan ve mesajlaşma akışı olan, öneri sistemiyle kişiselleşen bir kampüs pazarı geliştirmek.",
        ],
        left_x,
        y0,
        col_w,
        4.55,
        accent=BLUE,
    )

    add_card(
        slide,
        "2. Temel Kullanıcı Akışı",
        [
            "• Kayıt: yalnızca @posta.pau.edu.tr uzantılı okul e-postası kabul edilir.",
            "• İlan: kategori, durum, fiyat, açıklama ve çoklu fotoğraf ile yayınlanır.",
            "• Etkileşim: görüntüleme, favori, mesaj, anlaşma isteği, kabul ve satıldı sinyalleri kaydedilir.",
            "• Güven: satıcı profili, PAÜ doğrulama rozeti, değerlendirme ve admin moderasyonu desteklenir.",
        ],
        left_x,
        10.0,
        col_w,
        5.2,
        accent=TEAL,
    )

    add_card(
        slide,
        "3. Sistem Mimarisi",
        [
            "• Frontend: React + Vite ile responsive kullanıcı arayüzü.",
            "• Backend: ASP.NET Core Web API, JWT authentication, servis katmanı ve DTO yapısı.",
            "• Veritabanı: MSSQL / Entity Framework Core; kullanıcı, ilan, mesaj, etkileşim ve satış kayıtları.",
            "• Recommender: Python + FastAPI mikroservisi, backend ile HTTP üzerinden haberleşir.",
            "• DevOps: Docker Compose ile frontend, backend, SQL ve recommender tek komutla ayağa kalkar.",
        ],
        left_x,
        15.75,
        col_w,
        6.15,
        accent=CYAN,
    )

    add_card(
        slide,
        "4. Öne Çıkan Özellikler",
        [
            "✓ PAÜ okul e-postası doğrulama ve şifre sıfırlama",
            "✓ İlan oluşturma, düzenleme, çoklu görsel ve kapak sıralama",
            "✓ Favoriler ve güvenli mesajlaşma",
            "✓ Anlaşma isteği, satıldı akışı ve alıcı/satıcı kaydı",
            "✓ Satıcı değerlendirme ve admin/moderasyon paneli",
        ],
        left_x,
        22.45,
        col_w,
        5.05,
        accent=GREEN,
    )

    add_card(
        slide,
        "5. Öneri Sistemi Yaklaşımı",
        [
            "• Sistem klasik 'accuracy' problemi değil, Top-N ürün sıralama problemidir.",
            "• Kullanıcı-ilan etkileşim matrisi implicit feedback mantığıyla kurulur.",
            "• Event ağırlıkları: view=1.0, message=2.0, favorite=3.0, deal_request=4.0, purchase=5.0.",
            "• LightFM tabanlı hibrit yaklaşım collaborative sinyalleri kategori/içerik bilgisiyle birleştirir.",
            "• Cold-start durumunda backend; onboarding, kategori ilgisi ve popüler/yeni ilan fallback'i kullanır.",
        ],
        mid_x,
        y0,
        col_w,
        6.65,
        accent=BLUE,
    )

    add_box(slide, mid_x, 12.15, col_w, 3.15, fill=RGBColor(239, 246, 255), line=SOFT_BLUE)
    add_text(slide, "Veri Akışı", mid_x + 0.35, 12.45, col_w - 0.7, 0.45, size=20, bold=True, color=NAVY)
    add_flow(
        slide,
        mid_x + 0.45,
        13.18,
        ["Kullanıcı\nEtkileşimi", "Backend\nInteractions", "Python\nModel", "Sana Özel\nÖneriler"],
    )

    add_card(
        slide,
        "6. Recommender Matematiği",
        [
            "• Ana matris: R ∈ R^(|U| × |I|). Satırlar kullanıcı, sütunlar ilan, hücreler ilgi ağırlığıdır.",
            "• Sparse matrix kullanılır; çünkü her kullanıcı tüm ilanlarla etkileşmez.",
            "• Train/test ayrımı zaman tabanlı yapılır; önceki etkileşimlerden sonraki davranış tahmin edilir.",
            "• Model çıktısı backend'e gerçek PAÜ Market Listing.Id ile döner; backend aktif/onaylı/satılmamış ilan filtresi uygular.",
        ],
        mid_x,
        15.85,
        col_w,
        5.4,
        accent=TEAL,
    )

    add_card(
        slide,
        "7. Neden Pilot Veri?",
        [
            "• Büyük ölçekli gerçek PAÜ Market verisi başlangıçta yoktur.",
            "• Kontrollü pilot, sentetik veri yerine gerçek öğrencilerden gerçek davranış toplar.",
            "• Pilot sonrası model PAÜ Market etkileşimleriyle yeniden eğitilir.",
            "• Bu çalışma nihai ticari doğruluk değil, kampüs verisinden öğrenebilme kabiliyetini gösterir.",
        ],
        mid_x,
        21.8,
        col_w,
        5.0,
        accent=AMBER,
    )

    add_card(
        slide,
        "8. İki Veri Seti Savunması",
        [
            "• RetailRocket: tıklama/favori/satın alma benzeri interaction matrix simülasyonu için kullanılır.",
            "• Mercari: ikinci el ürün başlığı, açıklama, kategori ve kondisyon içeriğini analiz etmek için kullanılır.",
            "• ID'ler doğrudan eşleştirilmez; model çıktısı backend doğrulamasından geçer.",
            "• PAÜ pilot verisi biriktikçe ana değerlendirme kaynağı PAÜ Market export'u olacaktır.",
        ],
        mid_x,
        27.25,
        col_w,
        4.9,
        accent=CYAN,
    )

    add_card(
        slide,
        "9. Pilot Çalışma Planı",
        [
            "• 30-50 gerçekçi ilan: elektronik, ders kitabı, ev eşyası, giyim, hobi/spor ve not/özet.",
            "• 10-20 PAÜ öğrencisi: her kullanıcı kendi hesabıyla giriş yapar.",
            "• Kişi başı 10-20 davranış: görüntüleme, favori, mesaj ve anlaşma isteği.",
            "• 3-5 tamamlanmış satış senaryosu: satıcı değerlendirme ve güçlü satın alma sinyali.",
        ],
        right_x,
        y0,
        col_w,
        5.55,
        accent=GREEN,
    )

    add_box(slide, right_x, 11.05, col_w, 5.35, fill=RGBColor(255, 255, 255), line=BORDER)
    add_text(slide, "10. Değerlendirme Metrikleri", right_x + 0.35, 11.35, col_w - 0.7, 0.45, size=20, bold=True, color=NAVY)
    add_metric_table(slide, right_x + 0.35, 12.1, col_w - 0.7, 3.65)

    add_card(
        slide,
        "11. Beklenen Katkılar",
        [
            "• PAÜ öğrencilerine özel, doğrulanmış ve güvenli C2C pazar yeri deneyimi.",
            "• Mesajlaşma ve anlaşma akışı sayesinde alıcı-satıcı niyetinin veri olarak tutulması.",
            "• Recommender sistemi için kampüs bağlamına uygun interaction ağırlıkları.",
            "• Docker tabanlı, çok servisli ve genişletilebilir yazılım mimarisi.",
        ],
        right_x,
        17.0,
        col_w,
        5.2,
        accent=BLUE,
    )

    add_card(
        slide,
        "12. Sonuç",
        [
            "PAÜ Market; okul e-postası doğrulamalı güvenli pazar yeri, admin moderasyonu, kullanıcı mesajlaşması, anlaşma/satış kaydı ve hibrit öneri sistemiyle kampüs odaklı uçtan uca bir ürün prototipidir.",
            "Sunum sonrası pilot verilerle recommender modeli yeniden eğitilerek Precision@5, HitRate@5, Recall@5, NDCG@5 ve RMSE metrikleri final postere işlenecektir.",
        ],
        right_x,
        22.75,
        col_w,
        4.9,
        accent=TEAL,
    )

    add_box(slide, right_x, 28.15, col_w, 3.95, fill=RGBColor(240, 253, 250), line=SOFT_TEAL)
    add_text(slide, "Standda Gösterilecek Demo", right_x + 0.35, 28.45, col_w - 0.7, 0.45, size=20, bold=True, color=NAVY)
    demo_lines = [
        "1) Okul e-postasıyla kayıt/doğrulama",
        "2) İlan keşfi, favori ve mesajlaşma",
        "3) Anlaşma isteği ve satıldı akışı",
        "4) Kullanıcı profili/değerlendirme",
        "5) Sana Özel Öneriler alanı",
    ]
    add_text(slide, "\n".join(demo_lines), right_x + 0.45, 29.2, col_w - 0.9, 2.35, size=14.5, color=SLATE)

    # Footer
    footer = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, inches(33.6), prs.slide_width, inches(2.4))
    footer.fill.solid()
    footer.fill.fore_color.rgb = RGBColor(226, 232, 240)
    footer.line.color.rgb = RGBColor(226, 232, 240)
    add_text(
        slide,
        "Teknolojiler: React/Vite • ASP.NET Core Web API • MSSQL/EF Core • Python/FastAPI • LightFM • Docker Compose • Cloudinary • Brevo SMTP",
        1.1,
        34.05,
        33.5,
        0.45,
        size=13.2,
        bold=True,
        color=NAVY,
    )
    add_text(
        slide,
        "Not: Pilot metrik alanı gerçek kullanıcı etkileşimleri toplandıktan sonra güncellenecektir.",
        1.1,
        34.72,
        28.5,
        0.45,
        size=12.4,
        color=MUTED,
    )
    add_badge(slide, "PAÜ Market", 39.0, 34.18, 3.0, color=RGBColor(255, 255, 255), fill=BLUE)
    add_badge(slide, "2026", 42.25, 34.18, 1.6, color=NAVY, fill=SOFT_AMBER)

    prs.save(OUTPUT)
    print(f"Poster saved: {OUTPUT}")


if __name__ == "__main__":
    build_poster()
