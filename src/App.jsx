import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import logo from "./assets/logo.png";
import ltWaveFont from "./assets/LTWaveAlt-Black.otf";

const ADMIN_ID = "e9ab0b06-303d-43b4-abb6-53a58506006e";

function App() {
  const [oturum, setOturum] = useState(null);
  const [sayfa, setSayfa] = useState("arama");
  const [kontrol, setKontrol] = useState(true);

  useEffect(() => {
    kontrolEt();

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setOturum(session);
        }
      );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function kontrolEt() {
    const { data } = await supabase.auth.getSession();

    setOturum(data.session);
    setKontrol(false);
  }

  if (kontrol) {
    return (
      <div style={styles.yukleniyor}>
        Yükleniyor...
      </div>
    );
  }

  const adminMi = oturum?.user?.id === ADMIN_ID;

  return (
    <>
      <style>
        {`
          @font-face {
            font-family: "LT Wave Alt Black";
            src: url("${ltWaveFont}") format("opentype");
            font-weight: 900;
            font-style: normal;
            font-display: swap;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body,
          #root {
            width: 100%;
            min-width: 100%;
            min-height: 100%;
            margin: 0;
            padding: 0;
            background: #070910;
          }

          body {
            overflow-x: hidden;
          }

          button,
          input {
            font-family: inherit;
          }

          input::placeholder {
            color: rgba(220, 225, 240, 0.52);
            opacity: 1;
          }

          input:focus {
            border-color: rgba(110, 170, 255, 0.75) !important;
            box-shadow:
              0 0 0 3px rgba(70, 130, 255, 0.10),
              0 0 30px rgba(70, 130, 255, 0.10) !important;
          }

          ::selection {
            background: rgba(90, 130, 255, 0.45);
            color: white;
          }

          button {
            -webkit-tap-highlight-color: transparent;
          }

          .arama-kapsayici input::placeholder {
            color: #7f899d !important;
            opacity: 1;
          }

          .arama-kapsayici input:focus {
            border-color: rgba(180,195,255,.32) !important;
            background:
              linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.05)) !important;
            box-shadow:
              0 20px 60px rgba(0,0,0,.32),
              0 0 0 4px rgba(150,170,255,.055),
              inset 0 1px rgba(255,255,255,.11) !important;
          }

          .arama-kapsayici .sonuc:hover {
            transform: translateY(-2px);
            border-color: rgba(255,255,255,.18);
            box-shadow:
              0 22px 58px rgba(0,0,0,.32),
              inset 0 1px rgba(255,255,255,.09);
          }

          @keyframes etiketDolabiGiris {
            from {
              opacity: 0;
              transform: translateY(7px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .arama-kapsayici .sonuc {
            animation: etiketDolabiGiris .24s ease-out both;
          }

          @media (max-width: 600px) {
            .ust-menu {
              gap: 4px !important;
            }

            .ust-menu button {
              padding: 8px 9px !important;
              font-size: 12px !important;
            }

            .ana-logo {
              width: 170px !important;
              height: 170px !important;
            }

            .ana-baslik {
              font-size: 38px !important;
              letter-spacing: 1px !important;
            }

            .arama-kapsayici {
              width: calc(100% - 30px) !important;
            }
          }
        `}
      </style>

      <div style={styles.sayfa}>

        <header style={styles.header}>

          <div style={styles.headerIc}>

            <div style={styles.headerBosluk}></div>

            <div
              className="ust-menu"
              style={styles.menu}
            >

              <button
                style={styles.menuButon}
                onClick={() => setSayfa("arama")}
              >
                Ürün Ara
              </button>

              {!oturum && (
                <button
                  style={styles.menuButon}
                  onClick={() => setSayfa("giris")}
                >
                  Admin Girişi
                </button>
              )}

              {adminMi && (
                <>
                  <button
                    style={styles.menuButon}
                    onClick={() => setSayfa("admin")}
                  >
                    Admin Paneli
                  </button>

                  <button
                    style={styles.cikisButon}
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setSayfa("arama");
                    }}
                  >
                    Çıkış
                  </button>
                </>
              )}

            </div>

          </div>

        </header>

        {sayfa === "arama" && (
          <AramaSayfasi />
        )}

        {sayfa === "giris" && (
          <GirisSayfasi setSayfa={setSayfa} />
        )}

        {sayfa === "admin" && adminMi && (
          <AdminPanel />
        )}

      </div>
    </>
  );
}


/* =====================================================
   ARAMA SAYFASI
===================================================== */

function AramaSayfasi() {

  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  useEffect(() => {
    verileriGetir();
  }, []);

  useEffect(() => {

    const kanal = supabase
      .channel("urunler-canli-arama")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "urunler",
        },
        () => {
          verileriGetir();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };

  }, []);

  async function verileriGetir() {

    const { data, error } =
      await supabase
        .from("urunler")
        .select(
          "id, urun_kodu, urun_ismi, raf"
        )
        .order("urun_kodu");

    if (error) {
      console.error(error);

      setHata(
        "Ürünler alınırken bir hata oluştu."
      );
    } else {
      setUrunler(data || []);
    }

    setYukleniyor(false);
  }

  const kelime =
    arama
      .trim()
      .toLocaleLowerCase("tr-TR");

  const sonuclar =
    kelime
      ? urunler.filter((urun) => {

          const kod =
            (urun.urun_kodu || "")
              .toLocaleLowerCase("tr-TR");

          const isim =
            (urun.urun_ismi || "")
              .toLocaleLowerCase("tr-TR");

          const raf =
            (urun.raf || "")
              .toLocaleLowerCase("tr-TR");

          return (
            kod.includes(kelime) ||
            isim.includes(kelime) ||
            raf.includes(kelime)
          );
        })
      : [];

  return (
    <main style={styles.ana}>

      <div
        className="arama-kapsayici"
        style={styles.aramaKutu}
      >

        <div style={styles.logoMerkez}>

          <img
            className="ana-logo"
            src={logo}
            alt="Etiket Dolabı"
            style={styles.logoBuyuk}
          />

        </div>

        <div
          className="ana-baslik"
          style={styles.logoBuyukYazi}
        >
          ETİKET DOLABI
        </div>

        <p style={styles.altBaslik}>
          Ürün kodu, ürün adı veya raf ara
        </p>

        <div style={styles.toplamKutu}>

          <span>
            Toplam Ürün
          </span>

          <strong>
            {urunler.length}
          </strong>

        </div>

        <div style={styles.aramaAlani}>

          <input
            type="text"
            placeholder="Ürün kodu, ürün adı veya raf..."
            value={arama}
            onChange={(e) =>
              setArama(e.target.value)
            }
            style={styles.aramaInput}
            autoFocus
          />

          {arama && (
            <button
              onClick={() => setArama("")}
              style={styles.temizleButon}
            >
              ×
            </button>
          )}

        </div>

        {yukleniyor && (
          <p style={styles.bilgi}>
            Ürünler yükleniyor...
          </p>
        )}

        {hata && (
          <p style={styles.hata}>
            {hata}
          </p>
        )}

        {!yukleniyor &&
          !hata &&
          arama.trim() &&
          sonuclar.length === 0 && (

            <div style={styles.bulunamadi}>

              <strong>
                Ürün bulunamadı
              </strong>

              <span>
                "{arama}" için eşleşen kayıt yok.
              </span>

            </div>
          )}

        {arama.trim() &&
          sonuclar.length > 0 && (

            <div style={styles.sonucSayisi}>
              {sonuclar.length} kayıt bulundu
            </div>
          )}

        <div style={styles.sonuclar}>

          {sonuclar.map((urun) => (

            <div
              key={urun.id}
              style={styles.sonuc}
            >

              <div style={styles.urunKodu}>
                {urun.urun_kodu}
              </div>

              <div style={styles.urunIsmi}>
                {urun.urun_ismi}
              </div>

              <div style={styles.rafKutu}>

                <span style={styles.rafBaslik}>
                  RAF
                </span>

                <strong style={styles.rafDeger}>
                  {urun.raf || "-"}
                </strong>

              </div>

            </div>

          ))}

        </div>

        {!arama.trim() && !yukleniyor && (

          <div style={styles.baslangicMesaji}>

            <div style={styles.aramaIkon}>
              ⌕
            </div>

            <strong>
              Aramak için yazmaya başlayın
            </strong>

            <span>
              Ürün kodu, ürün adı veya raf üzerinden arama yapabilirsiniz.
            </span>

          </div>

        )}

      </div>

    </main>
  );
}


/* =====================================================
   GİRİŞ
===================================================== */

function GirisSayfasi({ setSayfa }) {

  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] =
    useState(false);

  async function girisYap(e) {

    e.preventDefault();

    setHata("");
    setYukleniyor(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password: sifre,
      });

    if (error) {

      setHata(
        "E-posta veya şifre hatalı."
      );

      setYukleniyor(false);
      return;
    }

    setYukleniyor(false);
    setSayfa("admin");
  }

  return (
    <main style={styles.ana}>

      <form
        onSubmit={girisYap}
        style={styles.girisKutu}
      >

        <h2 style={styles.formBaslik}>
          Admin Girişi
        </h2>

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Şifre"
          value={sifre}
          onChange={(e) =>
            setSifre(e.target.value)
          }
          style={styles.input}
        />

        {hata && (
          <p style={styles.hata}>
            {hata}
          </p>
        )}

        <button
          type="submit"
          style={styles.araButon}
          disabled={yukleniyor}
        >
          {yukleniyor
            ? "Giriş yapılıyor..."
            : "GİRİŞ YAP"}
        </button>

      </form>

    </main>
  );
}


/* =====================================================
   ADMIN PANELİ
===================================================== */

function AdminPanel() {

  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState("");

  const [form, setForm] = useState({
    id: null,
    urun_kodu: "",
    urun_ismi: "",
    raf: "",
  });

  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");

  const [excelUrunleri, setExcelUrunleri] =
    useState([]);

  const [excelDosya, setExcelDosya] =
    useState(null);

  const [excelMesaj, setExcelMesaj] =
    useState("");

  const [excelHata, setExcelHata] =
    useState("");

  const [excelYukleniyor, setExcelYukleniyor] =
    useState(false);

  useEffect(() => {
    urunleriGetir();
  }, []);

  async function urunleriGetir() {

    const { data, error } =
      await supabase
        .from("urunler")
        .select("*")
        .order("urun_kodu");

    if (error) {
      setHata(error.message);
      return;
    }

    setUrunler(data || []);
  }

  function formDegistir(e) {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function temizle() {

    setForm({
      id: null,
      urun_kodu: "",
      urun_ismi: "",
      raf: "",
    });

    setMesaj("");
    setHata("");
  }

  async function kaydet() {

    setMesaj("");
    setHata("");

    if (
      !form.urun_kodu.trim() ||
      !form.urun_ismi.trim()
    ) {

      setHata(
        "Ürün kodu ve ürün ismi zorunludur."
      );

      return;
    }

    if (form.id) {

      const { error } =
        await supabase
          .from("urunler")
          .update({
            urun_kodu:
              form.urun_kodu.trim(),

            urun_ismi:
              form.urun_ismi.trim(),

            raf:
              form.raf.trim(),

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", form.id);

      if (error) {
        setHata(error.message);
        return;
      }

      setMesaj(
        "Ürün güncellendi."
      );

    } else {

      const { error } =
        await supabase
          .from("urunler")
          .insert({
            urun_kodu:
              form.urun_kodu.trim(),

            urun_ismi:
              form.urun_ismi.trim(),

            raf:
              form.raf.trim(),
          });

      if (error) {
        setHata(error.message);
        return;
      }

      setMesaj(
        "Ürün eklendi."
      );
    }

    temizle();

    await urunleriGetir();
  }

  function duzenle(urun) {

    setForm({
      id: urun.id,

      urun_kodu:
        urun.urun_kodu || "",

      urun_ismi:
        urun.urun_ismi || "",

      raf:
        urun.raf || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function sil(urun) {

    const onay =
      window.confirm(
        `"${urun.urun_kodu}" ürününü silmek istediğine emin misin?`
      );

    if (!onay) {
      return;
    }

    const { error } =
      await supabase
        .from("urunler")
        .delete()
        .eq("id", urun.id);

    if (error) {
      setHata(error.message);
      return;
    }

    setMesaj(
      "Ürün silindi."
    );

    await urunleriGetir();
  }

  function excelSec(e) {

    const dosya =
      e.target.files[0];

    if (!dosya) {
      return;
    }

    setExcelDosya(dosya);
    setExcelMesaj("");
    setExcelHata("");
    setExcelUrunleri([]);

    const reader =
      new FileReader();

    reader.onload = (event) => {

      try {

        const data =
          new Uint8Array(
            event.target.result
          );

        const workbook =
          XLSX.read(data, {
            type: "array",
          });

        const ilkSayfa =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];

        const satirlar =
          XLSX.utils.sheet_to_json(
            ilkSayfa,
            {
              defval: "",
            }
          );

        const urunler =
          satirlar.map((satir) => {

            const urunKodu =
              satir["Ürün Kodu"] ??
              satir["urun_kodu"] ??
              satir["Ürün kodu"] ??
              "";

            const urunIsmi =
              satir["Ürün İsmi"] ??
              satir["urun_ismi"] ??
              satir["Ürün ismi"] ??
              satir["Ürün Adı"] ??
              satir["Ürün adı"] ??
              "";

            const raf =
              satir["Raf"] ??
              satir["raf"] ??
              "";

            return {
              urun_kodu:
                String(
                  urunKodu
                ).trim(),

              urun_ismi:
                String(
                  urunIsmi
                ).trim(),

              raf:
                String(
                  raf
                ).trim(),
            };
          });

        const gecerli =
          urunler.filter(
            (urun) =>
              urun.urun_kodu &&
              urun.urun_ismi
          );

        setExcelUrunleri(
          gecerli
        );

        if (gecerli.length > 0) {

          setExcelMesaj(
            `${gecerli.length} kayıt hazır.`
          );
        }

      } catch (error) {

        console.error(error);

        setExcelHata(
          "Excel dosyası okunamadı."
        );
      }
    };

    reader.readAsArrayBuffer(
      dosya
    );
  }

  async function excelAktar() {

    if (
      excelUrunleri.length === 0
    ) {

      setExcelHata(
        "Aktarılacak ürün bulunamadı."
      );

      return;
    }

    setExcelYukleniyor(true);
    setExcelMesaj("");
    setExcelHata("");

    try {

      const { error } =
        await supabase
          .from("urunler")
          .insert(
            excelUrunleri
          );

      if (error) {
        throw error;
      }

      setExcelMesaj(
        `${excelUrunleri.length} ürün başarıyla aktarıldı.`
      );

      setExcelUrunleri([]);
      setExcelDosya(null);

      const input =
        document.getElementById(
          "excelInput"
        );

      if (input) {
        input.value = "";
      }

      await urunleriGetir();

    } catch (error) {

      console.error(error);

      setExcelHata(
        "Excel aktarılırken hata oluştu: " +
        error.message
      );

    } finally {

      setExcelYukleniyor(false);
    }
  }

  function sablonIndir() {

    const veri = [
      {
        "Ürün Kodu": "ABC001",
        "Ürün İsmi": "Örnek Ürün",
        "Raf": "A-01-01",
      },
      {
        "Ürün Kodu": "ABC002",
        "Ürün İsmi": "Başka Ürün",
        "Raf": "B-02-05",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(veri);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Ürünler"
    );

    XLSX.writeFile(
      workbook,
      "ETIKET_DOLABI_SABLON.xlsx"
    );
  }

  const filtreliUrunler =
    urunler.filter((urun) => {

      const kelime =
        arama.toLocaleLowerCase(
          "tr-TR"
        );

      return (
        (urun.urun_kodu || "")
          .toLocaleLowerCase(
            "tr-TR"
          )
          .includes(kelime) ||

        (urun.urun_ismi || "")
          .toLocaleLowerCase(
            "tr-TR"
          )
          .includes(kelime) ||

        (urun.raf || "")
          .toLocaleLowerCase(
            "tr-TR"
          )
          .includes(kelime)
      );
    });

  return (
    <main style={styles.adminAna}>

      <div style={styles.adminKutu}>

        <div style={styles.adminBaslik}>

          <div>

            <h1 style={styles.adminLogo}>
              ETİKET DOLABI
            </h1>

            <p style={styles.adminAlt}>
              Admin Paneli
            </p>

          </div>

          <div style={styles.adminToplam}>

            <span>
              Toplam kayıt
            </span>

            <strong>
              {urunler.length}
            </strong>

          </div>

        </div>

        <div style={styles.form}>

          <h2>
            {form.id
              ? "Ürün Düzenle"
              : "Yeni Ürün Ekle"}
          </h2>

          <input
            name="urun_kodu"
            placeholder="Ürün Kodu"
            value={form.urun_kodu}
            onChange={formDegistir}
            style={styles.input}
          />

          <input
            name="urun_ismi"
            placeholder="Ürün İsmi"
            value={form.urun_ismi}
            onChange={formDegistir}
            style={styles.input}
          />

          <input
            name="raf"
            placeholder="Raf"
            value={form.raf}
            onChange={formDegistir}
            style={styles.input}
          />

          <div style={styles.formButonlari}>

            <button
              onClick={kaydet}
              style={styles.araButon}
            >
              {form.id
                ? "GÜNCELLE"
                : "ÜRÜN EKLE"}
            </button>

            {form.id && (
              <button
                onClick={temizle}
                style={styles.griButon}
              >
                İPTAL
              </button>
            )}

          </div>

          {mesaj && (
            <p style={styles.basari}>
              {mesaj}
            </p>
          )}

          {hata && (
            <p style={styles.hata}>
              {hata}
            </p>
          )}

        </div>

        <div style={styles.excelKutu}>

          <div style={styles.excelBaslik}>

            <div>

              <h2>
                Excel'den Toplu Aktar
              </h2>

              <p style={styles.excelAciklama}>
                Ürün Kodu | Ürün İsmi | Raf
              </p>

            </div>

            <button
              onClick={sablonIndir}
              style={styles.sablonButon}
            >
              Excel Şablonu İndir
            </button>

          </div>

          <input
            id="excelInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={excelSec}
            style={styles.dosyaInput}
          />

          {excelDosya && (
            <div style={styles.dosyaAdi}>
              Seçilen:
              <strong>
                {" "}
                {excelDosya.name}
              </strong>
            </div>
          )}

          {excelMesaj && (
            <p style={styles.basari}>
              {excelMesaj}
            </p>
          )}

          {excelHata && (
            <p style={styles.hata}>
              {excelHata}
            </p>
          )}

          {excelUrunleri.length > 0 && (

            <div style={styles.excelOnizleme}>

              <h3>
                Önizleme
              </h3>

              {excelUrunleri
                .slice(0, 15)
                .map(
                  (urun, index) => (

                    <div
                      key={index}
                      style={styles.onizlemeSatir}
                    >

                      <strong>
                        {urun.urun_kodu}
                      </strong>

                      <span>
                        {urun.urun_ismi}
                      </span>

                      <span>
                        {urun.raf || "-"}
                      </span>

                    </div>
                  )
                )}

              <button
                onClick={excelAktar}
                disabled={excelYukleniyor}
                style={styles.excelButon}
              >
                {excelYukleniyor
                  ? "AKTARILIYOR..."
                  : "EXCEL'İ AKTAR"}
              </button>

            </div>
          )}

        </div>

        <div style={styles.listeBaslik}>

          <div>

            <h2>
              Ürünler
            </h2>

            <span style={styles.kayitSayisi}>
              {filtreliUrunler.length} kayıt
            </span>

          </div>

          <input
            placeholder="Ürünlerde ara..."
            value={arama}
            onChange={(e) =>
              setArama(e.target.value)
            }
            style={styles.inputKucuk}
          />

        </div>

        {filtreliUrunler.map(
          (urun) => (

            <div
              key={urun.id}
              style={styles.adminUrun}
            >

              <div style={{ flex: 1 }}>

                <div style={styles.adminKod}>
                  {urun.urun_kodu}
                </div>

                <div style={styles.adminIsim}>
                  {urun.urun_ismi}
                </div>

              </div>

              <div style={styles.adminRaf}>
                {urun.raf || "-"}
              </div>

              <div style={styles.islemButonlari}>

                <button
                  onClick={() =>
                    duzenle(urun)
                  }
                  style={styles.duzenleButon}
                >
                  Düzenle
                </button>

                <button
                  onClick={() =>
                    sil(urun)
                  }
                  style={styles.silButon}
                >
                  Sil
                </button>

              </div>

            </div>
          )
        )}

      </div>

    </main>
  );
}


/* =====================================================
   TASARIM
===================================================== */

const styles = {

  sayfa: {
    width: "100%",
    minHeight: "100vh",

    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",

    color: "#f5f5f7",

    background:
      "radial-gradient(circle at 10% 8%, rgba(44,67,115,.30), transparent 30%), radial-gradient(circle at 90% 15%, rgba(88,52,130,.25), transparent 34%), linear-gradient(135deg,#070910 0%,#10131c 48%,#080910 100%)",
  },

  header: {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 100,

    background:
      "rgba(12,15,23,.68)",

    backdropFilter:
      "blur(28px) saturate(170%)",

    WebkitBackdropFilter:
      "blur(28px) saturate(170%)",

    borderBottom:
      "1px solid rgba(255,255,255,.10)",

    boxShadow:
      "0 10px 35px rgba(0,0,0,.28)",
  },

  headerIc: {
    width: "100%",
    maxWidth: "1400px",

    margin: "0 auto",

    minHeight: "56px",

    padding:
      "7px 20px",

    display: "flex",

    justifyContent:
      "flex-end",

    alignItems: "center",
  },

  headerBosluk: {
    flex: 1,
  },

  menu: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  menuButon: {
    border:
      "1px solid rgba(255,255,255,.13)",

    background:
      "rgba(255,255,255,.075)",

    color: "#f5f5f7",

    padding:
      "9px 14px",

    cursor: "pointer",

    borderRadius: "12px",

    backdropFilter:
      "blur(16px)",

    WebkitBackdropFilter:
      "blur(16px)",

    fontWeight: "600",
  },

  cikisButon: {
    border:
      "1px solid rgba(255,80,80,.32)",

    background:
      "linear-gradient(135deg,rgba(220,38,38,.86),rgba(170,20,35,.86))",

    color: "#fff",

    padding:
      "9px 15px",

    borderRadius: "12px",

    cursor: "pointer",

    fontWeight: "700",

    boxShadow:
      "0 5px 20px rgba(220,38,38,.20)",
  },

  ana: {
    width: "100%",
    minHeight:
      "calc(100vh - 56px)",

    display: "flex",

    justifyContent: "center",

    alignItems: "flex-start",

    padding:
      "34px 20px 80px",

    margin: 0,
  },

  aramaKutu: {
    width: "100%",
    maxWidth: "800px",

    marginLeft: "auto",
    marginRight: "auto",

    position: "relative",
    left: "0",
    right: "0",
  },

  logoMerkez: {
    width: "100%",

    display: "flex",

    justifyContent:
      "center",

    alignItems: "center",

    marginTop: "0",

    marginBottom: "0",

    textAlign: "center",
  },

  logoBuyuk: {
    width: "175px",

    height: "175px",

    objectFit: "contain",

    display: "block",

    margin:
      "0 auto",

    filter:
      "drop-shadow(0 0 18px rgba(100,145,255,.34))",
  },

  logoBuyukYazi: {
    width: "100%",

    display: "block",

    textAlign: "center",

    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    fontSize:
      "clamp(42px, 7vw, 66px)",

    fontWeight: "900",

    letterSpacing: "2px",

    lineHeight: "0.98",

    color: "#fff",

    marginTop: "5px",

    marginBottom: "0",

    textShadow:
      "0 0 25px rgba(255,255,255,.10)",
  },

  altBaslik: {
    width: "100%",

    display: "block",

    textAlign: "center",

    color: "#9299aa",

    fontSize: "16px",

    marginTop: "9px",

    marginBottom: "27px",
  },

  toplamKutu: {
    width: "100%",

    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    padding:
      "17px 20px",

    borderRadius: "20px",

    background:
      "linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.035))",

    border:
      "1px solid rgba(255,255,255,.12)",

    backdropFilter:
      "blur(30px) saturate(145%)",

    WebkitBackdropFilter:
      "blur(30px) saturate(145%)",

    boxShadow:
      "0 18px 50px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.08)",

    color: "#aeb6c7",

    marginBottom: "13px",
  },

  aramaAlani: {
    position: "relative",
    width: "100%",
  },

  aramaInput: {
    width: "100%",

    padding:
      "20px 58px 20px 22px",

    fontSize: "18px",

    fontWeight: "600",

    color: "#fff",

    WebkitTextFillColor: "#fff",

    caretColor: "#fff",

    background:
      "linear-gradient(135deg,rgba(255,255,255,.095),rgba(255,255,255,.045))",

    border:
      "1px solid rgba(255,255,255,.16)",

    borderRadius: "21px",

    outline: "none",

    backdropFilter:
      "blur(32px) saturate(150%)",

    WebkitBackdropFilter:
      "blur(32px) saturate(150%)",

    boxShadow:
      "0 18px 55px rgba(0,0,0,.30), inset 0 1px rgba(255,255,255,.10)",

    transition:
      "border-color .2s ease, box-shadow .2s ease, background .2s ease",
  },

  temizleButon: {
    position: "absolute",

    right: "12px",

    top: "50%",

    transform:
      "translateY(-50%)",

    width: "35px",

    height: "35px",

    border:
      "1px solid rgba(255,255,255,.17)",

    borderRadius: "50%",

    background:
      "rgba(255,255,255,.10)",

    color: "#e8eaf0",

    fontSize: "22px",

    cursor: "pointer",
  },

  bilgi: {
    textAlign: "center",
    color: "#9ca3af",
  },

  hata: {
    color: "#ff7070",
  },

  basari: {
    color: "#55df91",
  },

  sonucSayisi: {
    textAlign: "center",

    color: "#b5bdce",

    fontWeight: "700",

    margin:
      "24px 0 16px",
  },

  bulunamadi: {
    marginTop: "25px",

    padding: "28px",

    textAlign: "center",

    display: "flex",

    flexDirection: "column",

    gap: "8px",

    borderRadius: "20px",

    background:
      "rgba(255,255,255,.055)",

    border:
      "1px solid rgba(255,255,255,.10)",

    color: "#fff",
  },

  sonuclar: {
    width: "100%",
  },

  sonuc: {
    padding:
      "21px 20px 18px",

    marginBottom: "13px",

    borderRadius: "23px",

    textAlign: "left",

    background:
      "linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.035))",

    border:
      "1px solid rgba(255,255,255,.12)",

    backdropFilter:
      "blur(30px) saturate(145%)",

    WebkitBackdropFilter:
      "blur(30px) saturate(145%)",

    boxShadow:
      "0 18px 50px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.07)",

    transition:
      "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
  },

  urunKodu: {
    color: "#ffffff",

    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    fontSize: "30px",

    fontWeight: "900",

    letterSpacing: "0.5px",

    lineHeight: "1.05",

    marginBottom: "8px",

    wordBreak: "break-word",

    textShadow:
      "0 0 18px rgba(255,255,255,.08)",
  },

  urunIsmi: {
    color: "#ffffff",

    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    fontSize: "24px",

    fontWeight: "900",

    letterSpacing: "0.2px",

    lineHeight: "1.18",

    marginBottom: "18px",

    wordBreak: "break-word",

    textShadow:
      "0 0 18px rgba(255,255,255,.08)",
  },

  rafKutu: {
    display: "flex",

    alignItems: "center",

    justifyContent:
      "space-between",

    padding:
      "15px 17px",

    marginTop: "4px",

    borderRadius: "18px",

    background:
      "linear-gradient(135deg,rgba(105,125,175,.22),rgba(255,255,255,.055))",

    border:
      "1px solid rgba(175,195,245,.25)",

    boxShadow:
      "0 8px 28px rgba(0,0,0,.18), inset 0 1px rgba(255,255,255,.10)",
  },

  rafBaslik: {
    color: "#c8d5f0",

    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    fontSize: "13px",

    fontWeight: "900",

    letterSpacing: "1.5px",
  },

  rafDeger: {
    color: "#ffffff",

    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    fontSize: "32px",

    fontWeight: "900",

    lineHeight: "1",

    letterSpacing: "0.5px",

    textShadow:
      "0 0 20px rgba(170,195,255,.18)",
  },

  baslangicMesaji: {
    marginTop: "23px",

    padding:
      "31px 20px 27px",

    borderRadius: "22px",

    textAlign: "center",

    display: "flex",

    flexDirection: "column",

    gap: "8px",

    color: "#9da5b7",

    background:
      "linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))",

    border:
      "1px solid rgba(255,255,255,.09)",

    backdropFilter:
      "blur(25px)",

    WebkitBackdropFilter:
      "blur(25px)",

    boxShadow:
      "0 15px 45px rgba(0,0,0,.20), inset 0 1px rgba(255,255,255,.06)",
  },

  aramaIkon: {
    fontSize: "35px",
    color: "#9ca3ff",
  },

  girisKutu: {
    width: "100%",

    maxWidth: "410px",

    padding: "32px",

    height: "fit-content",

    borderRadius: "22px",

    background:
      "rgba(255,255,255,.065)",

    border:
      "1px solid rgba(255,255,255,.11)",

    backdropFilter:
      "blur(30px)",

    WebkitBackdropFilter:
      "blur(30px)",

    boxShadow:
      "0 20px 60px rgba(0,0,0,.35)",
  },

  formBaslik: {
    color: "#fff",
    marginTop: "0",
  },

  input: {
    width: "100%",

    padding: "14px",

    marginBottom: "11px",

    color: "#fff",

    WebkitTextFillColor: "#fff",

    caretColor: "#fff",

    background:
      "rgba(255,255,255,.065)",

    border:
      "1px solid rgba(255,255,255,.13)",

    borderRadius: "13px",

    outline: "none",

    fontSize: "16px",
  },

  araButon: {
    border:
      "1px solid rgba(255,255,255,.14)",

    background:
      "linear-gradient(135deg,rgba(91,110,170,.65),rgba(75,55,115,.65))",

    color: "#fff",

    padding:
      "13px 22px",

    borderRadius: "13px",

    fontWeight: "800",

    cursor: "pointer",
  },

  yukleniyor: {
    minHeight: "100vh",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#070910",

    color: "#fff",

    fontFamily: "Arial",
  },

  adminAna: {
    minHeight:
      "calc(100vh - 56px)",

    padding:
      "30px 20px 70px",

    background:
      "linear-gradient(135deg,#080a10,#111520)",

    color: "#fff",
  },

  adminKutu: {
    maxWidth: "1100px",
    margin: "auto",
  },

  adminBaslik: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "20px",
  },

  adminLogo: {
    fontFamily:
      "'LT Wave Alt Black', sans-serif",

    letterSpacing: "2px",
  },

  adminAlt: {
    color: "#9299aa",
  },

  adminToplam: {
    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    padding:
      "15px 22px",

    borderRadius: "16px",

    background:
      "rgba(255,255,255,.065)",

    border:
      "1px solid rgba(255,255,255,.10)",

    color: "#9ca3af",
  },

  form: {
    padding: "25px",

    marginTop: "20px",

    marginBottom: "25px",

    borderRadius: "21px",

    background:
      "rgba(255,255,255,.06)",

    border:
      "1px solid rgba(255,255,255,.10)",

    backdropFilter:
      "blur(25px)",

    WebkitBackdropFilter:
      "blur(25px)",
  },

  formButonlari: {
    display: "flex",
    gap: "10px",
  },

  griButon: {
    border:
      "1px solid rgba(255,255,255,.12)",

    background:
      "rgba(255,255,255,.07)",

    color: "#fff",

    padding:
      "13px 20px",

    borderRadius: "12px",

    cursor: "pointer",
  },

  excelKutu: {
    padding: "25px",

    marginBottom: "25px",

    borderRadius: "21px",

    background:
      "rgba(255,255,255,.06)",

    border:
      "1px solid rgba(255,255,255,.10)",

    backdropFilter:
      "blur(25px)",

    WebkitBackdropFilter:
      "blur(25px)",
  },

  excelBaslik: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "20px",
  },

  excelAciklama: {
    color: "#969eaf",
  },

  sablonButon: {
    padding:
      "11px 15px",

    borderRadius: "11px",

    border:
      "1px solid rgba(255,255,255,.12)",

    background:
      "rgba(255,255,255,.07)",

    color: "#fff",

    cursor: "pointer",
  },

  dosyaInput: {
    margin:
      "15px 0",

    color: "#ddd",
  },

  dosyaAdi: {
    color: "#aaa",
  },

  excelOnizleme: {
    marginTop: "20px",

    padding: "20px",

    borderRadius: "15px",

    background:
      "rgba(0,0,0,.20)",
  },

  onizlemeSatir: {
    display: "grid",

    gridTemplateColumns:
      "160px 1fr 150px",

    gap: "10px",

    padding: "10px",

    borderBottom:
      "1px solid rgba(255,255,255,.06)",
  },

  excelButon: {
    marginTop: "20px",

    padding:
      "13px 20px",

    borderRadius: "12px",

    border:
      "1px solid rgba(100,220,150,.20)",

    background:
      "rgba(20,120,65,.75)",

    color: "#fff",

    fontWeight: "800",

    cursor: "pointer",
  },

  listeBaslik: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "20px",

    marginBottom: "15px",
  },

  kayitSayisi: {
    color: "#9299aa",
  },

  inputKucuk: {
    width: "250px",

    padding: "12px",

    color: "#fff",

    WebkitTextFillColor: "#fff",

    caretColor: "#fff",

    background:
      "rgba(255,255,255,.06)",

    border:
      "1px solid rgba(255,255,255,.12)",

    borderRadius: "12px",

    outline: "none",
  },

  adminUrun: {
    display: "flex",

    alignItems: "center",

    gap: "15px",

    padding: "16px",

    marginBottom: "8px",

    borderRadius: "15px",

    background:
      "rgba(255,255,255,.055)",

    border:
      "1px solid rgba(255,255,255,.09)",
  },

  adminKod: {
    color: "#929aaa",

    fontSize: "13px",

    fontWeight: "700",
  },

  adminIsim: {
    color: "#fff",

    fontSize: "17px",

    fontWeight: "700",

    marginTop: "3px",
  },

  adminRaf: {
    padding:
      "10px 14px",

    borderRadius: "10px",

    color: "#fff",

    fontWeight: "800",

    background:
      "rgba(255,255,255,.08)",

    border:
      "1px solid rgba(255,255,255,.11)",
  },

  islemButonlari: {
    display: "flex",
    gap: "7px",
  },

  duzenleButon: {
    padding:
      "9px 12px",

    borderRadius: "10px",

    border:
      "1px solid rgba(255,255,255,.10)",

    background:
      "rgba(255,255,255,.07)",

    color: "#fff",

    cursor: "pointer",
  },

  silButon: {
    padding:
      "9px 12px",

    borderRadius: "10px",

    border:
      "1px solid rgba(255,70,70,.25)",

    background:
      "rgba(190,30,40,.75)",

    color: "#fff",

    cursor: "pointer",
  },
};

export default App;