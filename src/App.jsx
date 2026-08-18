import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

const ADMIN_ID = "e9ab0b06-303d-43b4-abb6-53a58506006e";

function App() {
  const [oturum, setOturum] = useState(null);
  const [sayfa, setSayfa] = useState("arama");
  const [kontrol, setKontrol] = useState(true);

  useEffect(() => {
    kontrolEt();

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
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

  const adminMi =
    oturum?.user?.id === ADMIN_ID;

  return (
    <div style={styles.sayfa}>

      <header style={styles.header}>
        <div style={styles.headerIc}>

          <div
            style={styles.logo}
            onClick={() => setSayfa("arama")}
          >
            RAFBUL
          </div>

          <div style={styles.menu}>

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
        <GirisSayfasi
          setSayfa={setSayfa}
        />
      )}

      {sayfa === "admin" && adminMi && (
        <AdminPanel />
      )}

    </div>
  );
}


/* =====================================
   ÜRÜN ARAMA
===================================== */

function AramaSayfasi() {

  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState("");
  const [sonuclar, setSonuclar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  useEffect(() => {
    verileriGetir();
  }, []);

  useEffect(() => {

    const kanal = supabase
      .channel("urunler-canli")
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

    const { data, error } = await supabase
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

  function ara() {

    const kelime = arama
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!kelime) {
      setSonuclar([]);
      return;
    }

    const bulunanlar =
      urunler.filter((urun) => {

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
      });

    setSonuclar(bulunanlar);
  }

  return (
    <main style={styles.ana}>

      <div style={styles.aramaKutu}>

        <h1 style={styles.baslik}>
          Ürününü Bul
        </h1>

        <p style={styles.altBaslik}>
          Ürün kodu, ürün adı veya raf ara
        </p>

        <div style={styles.aramaAlani}>

          <input
            type="text"
            placeholder="Örn: TEST001"
            value={arama}
            onChange={(e) =>
              setArama(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ara();
              }
            }}
            style={styles.input}
          />

          <button
            onClick={ara}
            style={styles.araButon}
          >
            ARA
          </button>

        </div>

        {yukleniyor && (
          <p style={styles.bilgi}>
            Veriler yükleniyor...
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
            <p style={styles.bilgi}>
              Ürün bulunamadı.
            </p>
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

              <div style={styles.bilgiler}>

                <div style={styles.bilgiKutusu}>

                  <span style={styles.etiket}>
                    RAF
                  </span>

                  <strong>
                    {urun.raf || "-"}
                  </strong>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}


/* =====================================
   ADMIN GİRİŞ
===================================== */

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

        <h2>Admin Girişi</h2>

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


/* =====================================
   ADMIN PANELİ
===================================== */

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

  useEffect(() => {

    const kanal = supabase
      .channel("admin-urunler-canli")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "urunler",
        },
        () => {
          urunleriGetir();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };

  }, []);

  async function urunleriGetir() {

    const { data, error } = await supabase
      .from("urunler")
      .select("*")
      .order("urun_kodu");

    if (error) {
      setHata(error.message);
      return;
    }

    setUrunler(data || []);
  }


  /* MANUEL ÜRÜN */

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
      !form.urun_kodu ||
      !form.urun_ismi
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
            urun_kodu: form.urun_kodu,
            urun_ismi: form.urun_ismi,
            raf: form.raf,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", form.id);

      if (error) {
        setHata(error.message);
        return;
      }

      setMesaj("Ürün güncellendi.");

    } else {

      const { error } =
        await supabase
          .from("urunler")
          .insert({
            urun_kodu: form.urun_kodu,
            urun_ismi: form.urun_ismi,
            raf: form.raf,
          });

      if (error) {
        setHata(error.message);
        return;
      }

      setMesaj("Ürün eklendi.");
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

    const onay = window.confirm(
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

    setMesaj("Ürün silindi.");

    await urunleriGetir();
  }


  /* =================================
     EXCEL OKUMA
  ================================= */

  function excelSec(e) {

    const dosya = e.target.files[0];

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
          satirlar
            .map((satir) => {

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
            })
            .filter(
              (urun) =>
                urun.urun_kodu &&
                urun.urun_ismi
            );

        if (urunler.length === 0) {

          setExcelHata(
            "Excel'de uygun ürün bulunamadı. Sütun isimleri Ürün Kodu, Ürün İsmi ve Raf olmalı."
          );

          return;
        }

        setExcelUrunleri(urunler);

        setExcelMesaj(
          `${urunler.length} ürün bulundu. Aktarmaya hazır.`
        );

      } catch (error) {

        console.error(error);

        setExcelHata(
          "Excel dosyası okunamadı."
        );
      }
    };

    reader.readAsArrayBuffer(dosya);
  }


  /* =================================
     EXCEL AKTAR
  ================================= */

  async function excelAktar() {

    if (excelUrunleri.length === 0) {

      setExcelHata(
        "Önce bir Excel dosyası seç."
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
          .upsert(
            excelUrunleri,
            {
              onConflict:
                "urun_kodu",
            }
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

        <h1>Admin Paneli</h1>

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

          <h2>
            Excel'den Toplu Ürün Aktar
          </h2>

          <p style={styles.excelAciklama}>
            Excel sütunları:
            <strong>
              {" "}Ürün Kodu | Ürün İsmi | Raf
            </strong>
          </p>

          <input
            id="excelInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={excelSec}
            style={styles.dosyaInput}
          />

          {excelDosya && (
            <p style={styles.dosyaAdi}>
              Seçilen dosya:
              <strong>
                {" "}{excelDosya.name}
              </strong>
            </p>
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

              <p>
                Toplam{" "}
                <strong>
                  {excelUrunleri.length}
                </strong>{" "}
                ürün bulundu.
              </p>

              <div style={styles.onizlemeListe}>

                {excelUrunleri
                  .slice(0, 10)
                  .map((urun, index) => (

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
                        Raf: {urun.raf || "-"}
                      </span>

                    </div>

                  ))}

              </div>

              {excelUrunleri.length > 10 && (
                <p style={styles.kucukYazi}>
                  İlk 10 ürün gösteriliyor.
                </p>
              )}

              <button
                onClick={excelAktar}
                disabled={excelYukleniyor}
                style={styles.excelButon}
              >
                {excelYukleniyor
                  ? "AKTARILIYOR..."
                  : "EXCEL'İ VERİTABANINA AKTAR"}
              </button>

            </div>

          )}

        </div>


        <div style={styles.listeBaslik}>

          <h2>
            Ürünler ({filtreliUrunler.length})
          </h2>

          <input
            placeholder="Ürünlerde ara..."
            value={arama}
            onChange={(e) =>
              setArama(e.target.value)
            }
            style={styles.inputKucuk}
          />

        </div>


        <div>

          {filtreliUrunler.map((urun) => (

            <div
              key={urun.id}
              style={styles.adminUrun}
            >

              <div style={{ flex: 1 }}>

                <strong>
                  {urun.urun_kodu}
                </strong>

                <div>
                  {urun.urun_ismi}
                </div>

                <small>
                  Raf: {urun.raf || "-"}
                </small>

              </div>

              <div
                style={styles.islemButonlari}
              >

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

          ))}

        </div>

      </div>

    </main>
  );
}


/* =====================================
   STİLLER
===================================== */

const styles = {

  sayfa: {
    minHeight: "100vh",
    background: "#f4f6f8",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "#111",
    color: "white",
  },

  headerIc: {
    maxWidth: "1100px",
    margin: "auto",
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
  },

  menu: {
    display: "flex",
    gap: "8px",
  },

  menuButon: {
    border: "none",
    background: "transparent",
    color: "white",
    padding: "9px 12px",
    cursor: "pointer",
  },

  cikisButon: {
    border: "none",
    background: "#c62828",
    color: "white",
    padding: "9px 14px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  ana: {
    minHeight: "calc(100vh - 60px)",
    display: "flex",
    justifyContent: "center",
    padding: "60px 20px",
    background: "#f4f6f8",
  },

  aramaKutu: {
    width: "100%",
    maxWidth: "750px",
  },

  baslik: {
    textAlign: "center",
    fontSize: "40px",
    marginBottom: "8px",
  },

  altBaslik: {
    textAlign: "center",
    color: "#777",
    marginBottom: "30px",
  },

  aramaAlani: {
    display: "flex",
    gap: "10px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    fontSize: "16px",
    border: "1px solid #ddd",
    borderRadius: "9px",
    outline: "none",
    marginBottom: "10px",
  },

  araButon: {
    border: "none",
    background: "#111",
    color: "white",
    padding: "14px 24px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  bilgi: {
    textAlign: "center",
    color: "#777",
    marginTop: "30px",
  },

  hata: {
    color: "#c62828",
    marginTop: "15px",
  },

  basari: {
    color: "#16803c",
    marginTop: "15px",
  },

  sonuclar: {
    marginTop: "25px",
  },

  sonuc: {
    background: "white",
    padding: "22px",
    borderRadius: "12px",
    marginBottom: "12px",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.05)",
  },

  urunKodu: {
    color: "#777",
    fontWeight: "bold",
    fontSize: "14px",
  },

  urunIsmi: {
    fontSize: "21px",
    fontWeight: "bold",
    marginTop: "5px",
    marginBottom: "20px",
  },

  bilgiler: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },

  bilgiKutusu: {
    background: "#f5f5f5",
    padding: "14px",
    borderRadius: "8px",
  },

  etiket: {
    display: "block",
    fontSize: "11px",
    color: "#888",
    marginBottom: "5px",
  },

  girisKutu: {
    background: "white",
    padding: "35px",
    borderRadius: "15px",
    width: "100%",
    maxWidth: "400px",
    height: "fit-content",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.08)",
  },

  yukleniyor: {
    padding: "50px",
    textAlign: "center",
    fontFamily: "Arial",
  },

  adminAna: {
    minHeight: "calc(100vh - 60px)",
    background: "#f4f6f8",
    padding: "35px 20px",
    fontFamily: "Arial, sans-serif",
  },

  adminKutu: {
    maxWidth: "1100px",
    margin: "auto",
  },

  form: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    marginTop: "20px",
    marginBottom: "30px",
  },

  formButonlari: {
    display: "flex",
    gap: "10px",
  },

  griButon: {
    border: "none",
    background: "#ddd",
    padding: "14px 20px",
    borderRadius: "9px",
    cursor: "pointer",
  },

  excelKutu: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "30px",
  },

  excelAciklama: {
    color: "#666",
    marginBottom: "20px",
  },

  dosyaInput: {
    display: "block",
    marginBottom: "15px",
  },

  dosyaAdi: {
    color: "#555",
  },

  excelOnizleme: {
    marginTop: "20px",
    padding: "20px",
    background: "#f7f7f7",
    borderRadius: "10px",
  },

  onizlemeListe: {
    marginTop: "15px",
  },

  onizlemeSatir: {
    display: "grid",
    gridTemplateColumns:
      "150px 1fr 150px",
    gap: "10px",
    padding: "10px",
    background: "white",
    borderBottom:
      "1px solid #eee",
  },

  kucukYazi: {
    fontSize: "13px",
    color: "#777",
  },

  excelButon: {
    marginTop: "20px",
    border: "none",
    background: "#16803c",
    color: "white",
    padding: "14px 20px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  listeBaslik: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    gap: "20px",
  },

  inputKucuk: {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    width: "250px",
  },

  adminUrun: {
    background: "white",
    padding: "18px",
    borderRadius: "10px",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  islemButonlari: {
    display: "flex",
    gap: "7px",
  },

  duzenleButon: {
    border: "none",
    background: "#eee",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  silButon: {
    border: "none",
    background: "#c62828",
    color: "white",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
  },
};

export default App;