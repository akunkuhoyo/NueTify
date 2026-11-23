import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — NueTify',
  description:
    'Syarat dan Ketentuan resmi penggunaan layanan streaming musik NueTify yang dikelola oleh PT Nueva Group.',
};

interface LegalSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: { label: string; text: string }[];
}

const SECTIONS: LegalSection[] = [
  {
    id: 'pasal-1',
    number: 'Pasal 1',
    title: 'Penerimaan & Pengikatan Syarat dan Ketentuan',
    paragraphs: [
      'Syarat dan Ketentuan ini ("Ketentuan") merupakan perjanjian hukum yang mengikat secara sah antara Anda sebagai pengguna ("Pengguna" atau "Anda") dan PT Nueva Group ("Kami", "Perusahaan", atau "Pengelola") selaku pengembang dan penyelenggara ekosistem layanan streaming musik NueTify.',
      'Dengan mengakses situs web NueTify, memasang atau menjalankan Progressive Web App (PWA), mengunduh serta menggunakan Aplikasi Android resmi NueTify, mendaftarkan akun, maupun menggunakan layanan melalui Mode Tamu (Guest Mode), Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat sepenuhnya pada seluruh isi Ketentuan ini serta Kebijakan Privasi NueTify yang menjadi satu kesatuan yang tidak terpisahkan.',
      'Apabila Anda tidak menyetujui sebagian atau seluruh ketentuan yang tercantum dalam dokumen ini, Anda tidak diperkenankan untuk mengakses, memasang, atau melanjutkan penggunaan layanan NueTify dalam bentuk apa pun.'
    ],
    bullets: [
      {
        label: 'Sifat Mengikat Perjanjian',
        text: 'Ketentuan ini berlaku sejak saat pertama kali Anda membuka layanan NueTify dan tetap berlaku selama Anda memiliki akun atau menggunakan fitur apa pun.'
      },
      {
        label: 'Keterkaitan dengan Kebijakan Privasi',
        text: 'Pengelolaan seluruh Data Pribadi Anda selama menggunakan layanan tunduk pada Kebijakan Privasi resmi NueTify yang tersedia di halaman /privacy.'
      }
    ]
  },
  {
    id: 'pasal-2',
    number: 'Pasal 2',
    title: 'Definisi Layanan NueTify (Web, PWA & Aplikasi Android)',
    paragraphs: [
      'NueTify adalah platform layanan streaming audio dan manajemen pustaka musik digital yang dikembangkan oleh PT Nueva Group untuk memberikan pengalaman mendengarkan musik yang cepat, personal, dan terintegrasi lintas perangkat.',
      'Istilah "Layanan" dalam dokumen ini mencakup seluruh antarmuka, fitur, basis data, API internal, serta perangkat lunak pendukung yang disediakan secara resmi oleh PT Nueva Group.'
    ],
    bullets: [
      {
        label: 'Aplikasi Web & Progressive Web App (PWA)',
        text: 'Layanan berbasis peramban modern yang dapat diakses secara langsung maupun dipasang ke layar utama perangkat desktop dan seluler dengan dukungan cache offline.'
      },
      {
        label: 'Aplikasi Android Resmi (com.ptnuevagroup.nuetify)',
        text: 'Paket aplikasi Android resmi yang didistribusikan oleh PT Nueva Group dengan dukungan pemutaran latar belakang (background playback), notifikasi media, dan integrasi sistem.'
      },
      {
        label: 'Fitur Ekosistem NueTify',
        text: 'Mencakup pemutar audio, Equalizer, Liked Songs, Playlists beserta Tag, Saved Albums & Artists, Riwayat Putar, Import Playlist Publik, serta Leaderboard komunitas.'
      }
    ]
  },
  {
    id: 'pasal-3',
    number: 'Pasal 3',
    title: 'Kelayakan Pengguna, Pendaftaran Akun & Keamanan Kredensial',
    paragraphs: [
      'Untuk menggunakan layanan NueTify, Anda harus berusia minimal 13 (tiga belas) tahun atau telah memenuhi usia minimum yang dipersyaratkan oleh hukum yang berlaku. Pengguna yang berusia di bawah 18 tahun atau belum cakap hukum wajib memperoleh izin dan pengawasan dari orang tua atau wali yang sah.',
      'Anda dapat menikmati fitur dasar secara lokal melalui Mode Tamu (Guest Mode) atau mendaftarkan akun resmi untuk mengaktifkan sinkronisasi cloud lintas perangkat serta berpartisipasi dalam Leaderboard publik.'
    ],
    bullets: [
      {
        label: 'Pendaftaran Email/Password dengan Verifikasi Email',
        text: 'Pengguna yang mendaftar menggunakan alamat email wajib menggunakan alamat email yang valid dan aktif serta menyelesaikan proses verifikasi email sebelum seluruh fitur akun dapat digunakan secara penuh.'
      },
      {
        label: 'Autentikasi Google OAuth',
        text: 'Pengguna dapat memilih masuk menggunakan akun Google yang sah melalui mekanisme OAuth resmi tanpa membagikan kata sandi Google Anda kepada PT Nueva Group.'
      },
      {
        label: 'Mode Tamu (Guest Mode)',
        text: 'Memungkinkan penggunaan tanpa akun dengan penyimpanan lokal di perangkat; namun PT Nueva Group tidak bertanggung jawab atas hilangnya pustaka lokal apabila cache peramban atau data aplikasi dihapus.'
      },
      {
        label: 'Tanggung Jawab Keamanan Kredensial',
        text: 'Anda bertanggung jawab penuh menjaga kerahasiaan kata sandi dan token sesi Anda. Segala aktivitas yang terjadi di bawah akun Anda dianggap sebagai tindakan Anda sendiri.'
      }
    ]
  },
  {
    id: 'pasal-4',
    number: 'Pasal 4',
    title: 'Aturan Nama Tampilan, Foto Profil, Tag Playlist & Perilaku Pengguna',
    paragraphs: [
      'NueTify menyediakan kebebasan kustomisasi profil agar pengalaman bermusik terasa lebih personal. Meskipun demikian, seluruh elemen yang dapat dilihat publik atau disimpan dalam sistem wajib mematuhi norma kesopanan, etika komunitas, dan hukum Republik Indonesia.',
      'PT Nueva Group berhak menolak, menghapus, atau mereset elemen profil yang melanggar ketentuan tanpa pemberitahuan terlebih dahulu.'
    ],
    bullets: [
      {
        label: 'Nama Tampilan (Display Name)',
        text: 'Panjang Nama Tampilan dibatasi maksimal 15 karakter. Dilarang keras menggunakan kata-kata kasar, ujaran kebencian, SARA, pornografi, peniruan identitas developer/admin resmi, atau tautan promosi spam.'
      },
      {
        label: 'URL Foto Profil Custom',
        text: 'Anda hanya diperbolehkan menggunakan gambar profil yang pantas, tidak mengandung konten asusila, kekerasan, pelanggaran hak cipta berat, maupun konten berbahaya/phishing.'
      },
      {
        label: 'Judul & Tag Playlist',
        text: 'Penamaan Playlist dan penggunaan Tag Playlist harus wajar, tidak menyesatkan, serta tidak digunakan sebagai sarana penyebaran materi ilegal atau berbahaya.'
      },
      {
        label: 'Etika Komunitas',
        text: 'Pengguna dilarang melakukan pelecehan, penipuan, atau tindakan yang mengganggu kenyamanan pengguna lain dalam ekosistem NueTify.'
      }
    ]
  },
  {
    id: 'pasal-5',
    number: 'Pasal 5',
    title: 'Larangan Keras Penyalahgunaan Sistem, Hacking & Manipulasi Leaderboard',
    paragraphs: [
      'PT Nueva Group menerapkan kebijakan toleransi nol (zero tolerance) terhadap segala bentuk penyalahgunaan teknis, peretasan, eksploitasi celah keamanan, maupun manipulasi statistik pada platform NueTify.',
      'Setiap upaya untuk mengakali sistem pengukuran durasi mendengarkan atau merusak keadilan kompetisi pada Leaderboard akan terdeteksi oleh sistem pengamanan dan berakibat pada sanksi pemblokiran permanen.'
    ],
    bullets: [
      {
        label: 'Larangan Bot, Skrip Otomatis & Farming',
        text: 'Dilarang keras menggunakan bot, emulator otomatis, macro, atau skrip apa pun untuk memutar lagu secara artifisial demi meningkatkan jam dengar atau jumlah putar.'
      },
      {
        label: 'Larangan Spoofing API & Manipulasi Statistik',
        text: 'Dilarang memalsukan payload permintaan API, memanipulasi timer pemutar, mengirimkan data durasi dengar palsu ke server, atau memodifikasi lalu lintas jaringan untuk menggelembungkan statistik Leaderboard.'
      },
      {
        label: 'Larangan Bypass Autentikasi & RLS',
        text: 'Dilarang mencoba melewati mekanisme verifikasi email, autentikasi OAuth, pembatasan akses admin, atau kebijakan Row Level Security (RLS) basis data.'
      },
      {
        label: 'Larangan Scraping Ilegal & Reverse Engineering',
        text: 'Dilarang melakukan scraping massal terhadap endpoint internal NueTify, melakukan dekompilasi, membongkar kode biner APK com.ptnuevagroup.nuetify, atau mengeksploitasi infrastruktur server untuk tujuan komersial tanpa izin tertulis.'
      }
    ]  {
    id: 'pasal-6',
    number: 'Pasal 6',
    title: 'Sistem Integritas Leaderboard & Kewenangan Administrator',
    paragraphs: [
      'Leaderboard NueTify dirancang untuk mencerminkan aktivitas mendengarkan musik yang jujur dan organik. Untuk menjaga kepercayaan seluruh komunitas, PT Nueva Group dan tim administrator yang berwenang memiliki hak penuh untuk memantau, mengaudit, dan menegakkan integritas statistik peringkat.',
      'Selain itu, akun milik pengembang atau pihak resmi PT Nueva Group dapat diberikan lencana verifikasi khusus sebagai penanda keaslian identitas.'
    ],
    bullets: [
      {
        label: 'Penyesuaian & Reset Statistik',
        text: 'Administrator berhak menyesuaikan, mengurangi, atau mereset total durasi dengar dan jumlah putar apabila ditemukan anomali teknis, bug, atau indikasi manipulasi yang tidak wajar.'
      },
      {
        label: 'Audit Log Keamanan',
        text: 'Setiap tindakan administratif dan anomali pembaruan statistik dicatat dalam Audit Log untuk keperluan transparansi internal dan penelusuran pelanggaran.'
      },
      {
        label: 'Verifikasi Developer Resmi',
        text: 'PT Nueva Group berhak memberikan atau mencabut status serta lencana terverifikasi resmi bagi akun pengembang atau mitra resmi NueTify.'
      }
    ]
  },
  {
    id: 'pasal-7',
    number: 'Pasal 7',
    title: 'Penegakan Aturan, Penangguhan Sementara & Pemblokiran Permanen',
    paragraphs: [
      'Apabila Pengguna terbukti atau patut diduga kuat melanggar salah satu ketentuan dalam dokumen ini, PT Nueva Group berhak mengambil tindakan penegakan disiplin akun secara sepihak melalui sistem Ban Hammer demi melindungi ekosistem layanan.',
      'Pada saat sanksi penangguhan atau pemblokiran aktif diberlakukan pada suatu akun, sistem akan secara otomatis menghentikan pemutaran audio yang sedang berlangsung dan membatasi akses ke layanan terautentikasi.'
    ],
    bullets: [
      {
        label: 'Penangguhan Sementara & Pemblokiran Permanen',
        text: 'Sanksi dapat berupa penangguhan sementara (dengan durasi tertentu) maupun pemblokiran permanen (permanent ban) tergantung pada tingkat keparahan pelanggaran.'
      },
      {
        label: 'Penghentian Pemutaran Otomatis & Informasi Ban',
        text: 'Saat akun diblokir, sesi pemutar audio dihentikan secara real-time dan pengguna akan ditampilkan alasan pemblokiran serta durasi atau status permanen sanksi tersebut.'
      },
      {
        label: 'Pengajuan Banding (Unban)',
        text: 'Pengguna yang meyakini pemblokiran terjadi karena kekeliruan teknis dapat mengajukan permohonan banding resmi melalui email ke drevviann@gmail.com dengan menyertakan email akun dan penjelasan kronologis.'
      }
    ]
  },
  {
    id: 'pasal-8',
    number: 'Pasal 8',
    title: 'Fitur Import Playlist (YouTube Music & Spotify Publik) & Konten Pihak Ketiga',
    paragraphs: [
      'NueTify menyediakan fitur Import Playlist untuk memudahkan Pengguna memindahkan daftar lagu favorit dari tautan playlist publik Spotify maupun YouTube Music ke dalam pustaka NueTify.',
      'Seluruh metadata lagu, sampul album, dan aliran audio yang diakses melalui layanan berasal dari sumber pihak ketiga yang tersedia secara publik; PT Nueva Group tidak mengklaim kepemilikan atas karya musik milik artis, label rekaman, atau pemegang hak cipta terkait.'
    ],
    bullets: [
      {
        label: 'Ketersediaan Tautan Publik',
        text: 'Fitur import hanya dapat membaca daftar lagu dari playlist yang bersifat publik dan tidak memerlukan kredensial login akun Spotify Anda.'
      },
      {
        label: 'Tanggung Jawab Konten Pihak Ketiga',
        text: 'Ketersediaan, akurasi metadata, dan kelancaran pemutaran lagu bergantung pada sumber penyedia pihak ketiga. PT Nueva Group tidak bertanggung jawab atas penghapusan atau perubahan konten dari sumber eksternal.'
      }
    ]
  },
  {
    id: 'pasal-9',
    number: 'Pasal 9',
    title: 'Hak Kekayaan Intelektual PT Nueva Group & Lisensi Penggunaan Terbatas',
    paragraphs: [
      'Seluruh hak kekayaan intelektual atas merek dagang NueTify, logo, desain antarmuka, kode sumber aplikasi web, PWA, aplikasi Android, basis data struktur, serta dokumentasi terkait adalah milik eksklusif PT Nueva Group dan dilindungi oleh hukum hak cipta dan merek Republik Indonesia maupun konvensi internasional.',
      'PT Nueva Group memberikan kepada Anda lisensi terbatas, non-eksklusif, tidak dapat dipindahtangankan, dan dapat dicabut sewaktu-waktu untuk mengakses serta menggunakan Layanan semata-mata untuk keperluan pribadi dan non-komersial.'
    ],
    bullets: [
      {
        label: 'Larangan Eksploitasi Komersial',
        text: 'Anda tidak diperkenankan menyalin, memodifikasi, mendistribusikan ulang, menjual, atau menyewakan bagian mana pun dari Layanan NueTify tanpa persetujuan tertulis dari PT Nueva Group.'
      },
      {
        label: 'Pelindungan Merek & Identitas Visual',
        text: 'Penggunaan nama, logo, atau aset visual NueTify untuk tujuan penipuan, aplikasi tiruan (cloning), atau afiliasi palsu merupakan pelanggaran hukum yang akan ditindak tegas.'
      }
    ]
  },
  {
    id: 'pasal-10',
    number: 'Pasal 10',
    title: 'Pemutaran Latar Belakang, Equalizer Perangkat Keras & Ketersediaan Layanan',
    paragraphs: [
      'NueTify berupaya menghadirkan kualitas audio terbaik melalui dukungan pemutaran latar belakang (background playback) pada peramban yang mendukung, PWA, dan Aplikasi Android, serta fitur Equalizer untuk menyesuaikan karakter suara sesuai preferensi telinga Anda.',
      'Meskipun kami berusaha menjaga tingkat ketersediaan layanan setinggi mungkin, kami tidak menjamin bahwa layanan akan selalu bebas dari gangguan jaringan, latensi ISP, atau keterbatasan kompatibilitas perangkat keras tertentu.'
    ],
    bullets: [
      {
        label: 'Equalizer & Keselamatan Pendengaran',
        text: 'Penggunaan fitur Equalizer dan pengaturan tingkat volume berada sepenuhnya di bawah kendali Pengguna. Harap gunakan volume yang aman untuk menjaga kesehatan pendengaran Anda.'
      },
      {
        label: 'Batasan Sistem Operasi Perangkat',
        text: 'Kestabilan pemutaran latar belakang pada perangkat seluler dapat dipengaruhi oleh fitur penghemat baterai (battery optimization) masing-masing pabrikan perangkat.'
      }
    ]
  },
  {
    id: 'pasal-11',
    number: 'Pasal 11',
    title: 'Mode Pemeliharaan, Pembaruan Real-Time & Distribusi Aplikasi Android (APK)',
    paragraphs: [
      'Untuk menjaga performa, keamanan, serta menghadirkan fitur-fitur baru, PT Nueva Group berhak melakukan pemeliharaan sistem terjadwal maupun darurat, termasuk mengaktifkan Mode Pemeliharaan (Maintenance Mode) yang dapat membatasi akses sementara ke layanan.',
      'Untuk pengguna Aplikasi Android NueTify (com.ptnuevagroup.nuetify), pembaruan versi APK resmi hanya didistribusikan melalui saluran resmi PT Nueva Group guna menjamin keaslian tanda tangan digital dan keamanan perangkat Anda.'
    ],
    bullets: [
      {
        label: 'Pemberitahuan Maintenance Real-Time',
        text: 'Saat Mode Pemeliharaan diaktifkan, pengguna akan menerima pemberitahuan secara real-time di antarmuka aplikasi mengenai status pemeliharaan yang sedang berlangsung.'
      },
      {
        label: 'Keamanan Instalasi APK Resmi',
        text: 'PT Nueva Group tidak bertanggung jawab atas kerugian, kebocoran data, atau kerusakan perangkat yang timbul akibat mengunduh dan memasang berkas APK NueTify yang telah dimodifikasi (MOD) dari sumber tidak resmi.'
      }
    ]
  },
    {
    id: 'pasal-12',
    number: 'Pasal 12',
    title: 'Penafian Jaminan (Disclaimer of Warranties)',
    paragraphs: [
      'Sejauh diizinkan oleh hukum yang berlaku, Layanan NueTify (termasuk Web, PWA, dan Aplikasi Android) disediakan dalam kondisi "SEBAGAIMANA ADANYA" (as is) dan "SEBAGAIMANA TERSEDIA" (as available), tanpa jaminan dalam bentuk apa pun, baik tersurat maupun tersirat.',
      'PT Nueva Group tidak menjamin bahwa Layanan akan selalu berjalan tanpa gangguan, bebas dari kesalahan teknis, bebas dari virus atau komponen berbahaya, maupun bahwa seluruh lagu atau metadata pihak ketiga akan selalu tersedia setiap saat.'
    ],
    bullets: [
      {
        label: 'Ketergantungan Jaringan & Pihak Ketiga',
        text: 'Kualitas streaming audio dan sinkronisasi data bergantung pada koneksi internet Pengguna serta stabilitas penyedia layanan pihak ketiga.'
      },
      {
        label: 'Risiko Penggunaan Mandiri',
        text: 'Penggunaan Layanan dilakukan atas pertimbangan dan risiko Anda sendiri.'
      }
    ]
  },
  {
    id: 'pasal-13',
    number: 'Pasal 13',
    title: 'Batasan Tanggung Jawab Hukum (Limitation of Liability)',
    paragraphs: [
      'Sejauh diperbolehkan oleh peraturan perundang-undangan Republik Indonesia, PT Nueva Group, jajaran direksi, pengembang, karyawan, dan afiliasinya tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, atau kerugian immateriil yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan NueTify.',
      'Hal tersebut mencakup namun tidak terbatas pada hilangnya data pustaka lokal pada Mode Tamu, gangguan pemutaran akibat pemeliharaan sistem, atau penghentian akun akibat pelanggaran Ketentuan ini.'
    ],
    bullets: [
      {
        label: 'Layanan Gratis',
        text: 'Mengingat Layanan NueTify disediakan secara gratis kepada pengguna umum, PT Nueva Group tidak memiliki kewajiban ganti rugi finansial atas gangguan layanan sementara.'
      },
      {
        label: 'Keadaan Kahar (Force Majeure)',
        text: 'PT Nueva Group dibebaskan dari tanggung jawab atas kegagalan layanan yang disebabkan oleh bencana alam, gangguan jaringan global, pemadaman pusat data, kebijakan pemerintah, atau kejadian di luar kendali wajar kami.'
      }
    ]
  },
  {
    id: 'pasal-14',
    number: 'Pasal 14',
    title: 'Ganti Rugi (Indemnification)',
    paragraphs: [
      'Anda setuju untuk membela, mengganti rugi, dan membebaskan PT Nueva Group beserta seluruh pengembang, staf, dan mitranya dari segala klaim, tuntutan hukum, gugatan pihak ketiga, kerugian, denda, serta biaya hukum wajar yang timbul secara langsung maupun tidak langsung akibat tindakan Anda.',
      'Kewajiban ganti rugi ini tetap berlaku meskipun Anda telah berhenti menggunakan Layanan NueTify atau akun Anda telah ditutup.'
    ],
    bullets: [
      {
        label: 'Pelanggaran Ketentuan & Hukum',
        text: 'Meliputi setiap pelanggaran Anda terhadap Syarat & Ketentuan ini, Kebijakan Privasi, atau peraturan perundang-undangan yang berlaku.'
      },
      {
        label: 'Penyalahgunaan Teknis & Hak Pihak Ketiga',
        text: 'Meliputi tindakan peretasan, manipulasi API, penyebaran konten melanggar hukum melalui profil/playlist, atau pelanggaran hak kekayaan intelektual pihak ketiga.'
      }
    ]
  },
  {
    id: 'pasal-15',
    number: 'Pasal 15',
    title: 'Hukum yang Berlaku & Mekanisme Penyelesaian Sengketa',
    paragraphs: [
      'Syarat dan Ketentuan ini diatur, ditafsirkan, dan dilaksanakan sepenuhnya berdasarkan hukum Negara Republik Indonesia, tanpa memperhatikan pertentangan prinsip hukum antar-yurisdiksi.',
      'Apabila timbul perselisihan, sengketa, atau perbedaan penafsiran sehubungan dengan pelaksanaan Ketentuan ini, para pihak sepakat untuk mengutamakan penyelesaian secara musyawarah untuk mufakat dalam jangka waktu 30 (tiga puluh) hari kalender sejak pemberitahuan sengketa diterima.'
    ],
    bullets: [
      {
        label: 'Musyawarah Kekeluargaan',
        text: 'Pengguna dapat menyampaikan keluhan atau sengketa secara tertulis terlebih dahulu melalui email resmi PT Nueva Group di drevviann@gmail.com.'
      },
      {
        label: 'Yurisdiksi Penyelesaian Lanjutan',
        text: 'Apabila musyawarah tidak mencapai kesepakatan, penyelesaian sengketa akan ditempuh melalui mekanisme hukum yang berwenang di wilayah hukum Negara Republik Indonesia.'
      }
    ]
  },
  {
    id: 'pasal-16',
    number: 'Pasal 16',
    title: 'Perubahan Syarat & Ketentuan, Keterpisahan Klausul & Kontak Resmi',
    paragraphs: [
      'PT Nueva Group berhak mengubah, menambah, atau memperbarui isi Syarat dan Ketentuan ini sewaktu-waktu sesuai kebutuhan pengembangan layanan dan kepatuhan hukum. Perubahan akan mulai berlaku segera setelah dipublikasikan di halaman ini dengan pembaruan tanggal efektif.',
      'Apabila terdapat satu atau lebih klausul dalam Ketentuan ini yang dinyatakan tidak sah atau tidak dapat dilaksanakan oleh pengadilan yang berwenang, maka ketidakabsahan tersebut tidak memengaruhi keabsahan klausul lainnya, yang akan tetap berlaku penuh.'
    ],
    bullets: [
      {
        label: 'Entitas Pengelola Resmi',
        text: 'PT Nueva Group — Indonesia'
      },
      {
        label: 'Email Kontak Resmi & Pengajuan Banding',
        text: 'drevviann@gmail.com'
      },
      {
        label: 'Pemberlakuan Berkelanjutan',
        text: 'Dengan tetap mengakses Layanan NueTify setelah perubahan Ketentuan dipublikasikan, Anda dianggap menyetujui Ketentuan yang telah diperbarui.'
      }
    ]
  }
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-[#E5E5E5] antialiased selection:bg-[#C0C0C0]/25 selection:text-white">
      {/* Header Navigasi */}
      <header className="sticky top-0 z-30 border-b border-[#C0C0C0]/15 bg-[#121212]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#C0C0C0]/15 bg-[#181818] px-4 py-2 text-xs font-medium text-[#E5E5E5] transition hover:border-[#C0C0C0]/40 hover:bg-[#222222]"
            >
              <span aria-hidden="true">&larr;</span>
              <span>Kembali ke NueTify</span>
            </Link>
            <Link href="/" className="flex items-center">
              <img
                src="https://i.ibb.co.com/zVTpRV9L/Proyek-Baru-598-652-F167.png"
                alt="NueTify"
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          <nav className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#C0C0C0]/20 bg-[#181818] px-3 py-1 text-xs font-medium text-[#C0C0C0] sm:inline-block">
              Syarat &amp; Ketentuan
            </span>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C0C0C0]/15 bg-[#181818] px-4 py-2 text-xs font-medium text-[#A7A7A7] transition hover:border-[#C0C0C0]/40 hover:text-[#E5E5E5]"
            >
              <span>Kebijakan Privasi</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Hero / Judul Dokumen */}
        <section className="mb-10 rounded-2xl border border-[#C0C0C0]/15 bg-[#181818] p-6 sm:p-10">
          <div className="mb-4 inline-flex items-center rounded-full border border-[#C0C0C0]/20 bg-[#121212] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#C0C0C0]">
            Dokumen Legal Resmi &middot; PT Nueva Group
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E5E5E5] sm:text-4xl">
            Syarat &amp; Ketentuan NueTify
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#A7A7A7] sm:text-base">
            Terakhir Diperbarui: 23 November 2026 &middot; Berlaku Efektif untuk Web, PWA, dan Aplikasi Android NueTify
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#A7A7A7]">
            Dokumen ini mengatur hak, kewajiban, larangan penyalahgunaan, serta ketentuan hukum penggunaan seluruh ekosistem layanan streaming musik NueTify yang dikelola oleh PT Nueva Group di Republik Indonesia.
          </p>
        </section>

        {/* Daftar Isi */}
        <section
          aria-labelledby="daftar-isi-heading"
          className="mb-10 rounded-2xl border border-[#C0C0C0]/15 bg-[#181818] p-6 sm:p-8"
        >
          <h2
            id="daftar-isi-heading"
            className="mb-4 text-lg font-semibold text-[#E5E5E5]"
          >
            Daftar Isi
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-start gap-2.5 rounded-xl border border-[#C0C0C0]/10 bg-[#121212]/70 px-3.5 py-2.5 text-sm transition hover:border-[#C0C0C0]/35 hover:bg-[#202020]"
              >
                <span className="shrink-0 font-semibold text-[#C0C0C0]">
                  {section.number}.
                </span>
                <span className="text-[#A7A7A7] transition group-hover:text-[#E5E5E5]">
                  {section.title}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* 16 Pasal Syarat & Ketentuan */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-[#C0C0C0]/15 bg-[#181818] p-6 sm:p-8"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-[#C0C0C0]/15 pb-4">
                <span className="rounded-lg border border-[#C0C0C0]/25 bg-[#121212] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C0C0C0]">
                  {section.number}
                </span>
                <h2 className="text-xl font-semibold text-[#E5E5E5] sm:text-2xl">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-[#A7A7A7] sm:text-base">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-5 space-y-3 border-t border-[#C0C0C0]/10 pt-5">
                  {section.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-[#C0C0C0]/10 bg-[#121212]/60 p-4 text-sm leading-relaxed"
                    >
                      <span className="font-semibold text-[#E5E5E5]">
                        {bullet.label}:{' '}
                      </span>
                      <span className="text-[#A7A7A7]">{bullet.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        {/* Footer Dokumen Legal */}
        <footer className="mt-12 rounded-2xl border border-[#C0C0C0]/15 bg-[#181818] p-6 text-center sm:p-8">
          <p className="text-sm font-medium text-[#E5E5E5]">
            &copy; 2026 PT Nueva Group. Seluruh Hak Cipta Dilindungi Undang-Undang.
          </p>
          <p className="mt-2 text-xs text-[#A7A7A7]">
            Layanan Streaming Musik NueTify (Web, PWA &amp; Android com.ptnuevagroup.nuetify)
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-[#C0C0C0]/15 bg-[#121212] px-4 py-2 text-xs font-medium text-[#E5E5E5] transition hover:border-[#C0C0C0]/40"
            >
              Kembali ke NueTify
            </Link>
            <Link
              href="/privacy"
              className="rounded-full border border-[#C0C0C0]/15 bg-[#121212] px-4 py-2 text-xs font-medium text-[#C0C0C0] transition hover:border-[#C0C0C0]/40 hover:text-[#E5E5E5]"
            >
              Baca Kebijakan Privasi
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

  },
  
