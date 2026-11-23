import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
export const metadata: Metadata = {
  title: 'Kebijakan Privasi — NueTify',
  description:
    'Kebijakan Privasi resmi layanan streaming musik NueTify yang dikembangkan oleh PT Nueva Group.',
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
    title: 'Pendahuluan, Ruang Lingkup & Identitas Pengendali Data',
    paragraphs: [
      'Selamat datang di NueTify. Kebijakan Privasi ini merupakan dokumen hukum resmi yang menjelaskan secara rinci, transparan, dan akuntabel bagaimana PT Nueva Group ("Kami", "Perusahaan", atau "Pengendali Data") mengumpulkan, menggunakan, menyimpan, memproses, mengamankan, membagikan, dan menghapus Data Pribadi Anda saat Anda mengakses, mendaftar, atau menggunakan ekosistem layanan streaming musik NueTify.',
      'Kebijakan Privasi ini berlaku secara menyeluruh untuk seluruh platform resmi NueTify yang dikelola oleh PT Nueva Group, mencakup aplikasi web (nuetify), Progressive Web App (PWA) yang terpasang pada perangkat desktop maupun seluler, serta aplikasi Android resmi NueTify dengan pengenal paket com.ptnuevagroup.nuetify. Dengan mengakses layanan kami, baik sebagai pengguna terdaftar maupun sebagai pengguna dalam Mode Tamu (Guest Mode), Anda menyatakan telah membaca, memahami, dan menyetujui praktik pengelolaan data yang diuraikan dalam dokumen ini.',
      'Sebagai entitas teknologi yang beroperasi dan tunduk pada hukum Negara Republik Indonesia, PT Nueva Group berkomitmen penuh untuk menjunjung tinggi hak privasi setiap individu sesuai dengan standar pelindungan data modern serta Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) beserta peraturan pelaksananya.'
    ],
    bullets: [
      {
        label: 'Nama Pengendali Data',
        text: 'PT Nueva Group (Divisi Pengembangan Produk Digital & Layanan Streaming Musik NueTify).'
      },
      {
        label: 'Cakupan Platform',
        text: 'Aplikasi Web NueTify, Progressive Web App (PWA), dan Aplikasi Android Resmi (com.ptnuevagroup.nuetify).'
      },
      {
        label: 'Kepatuhan Regulasi',
        text: 'Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) Republik Indonesia dan ketentuan hukum terkait sistem elektronik.'
      }
    ]
  },
  {
    id: 'pasal-2',
    number: 'Pasal 2',
    title: 'Definisi & Istilah Hukum',
    paragraphs: [
      'Untuk memastikan keseragaman pemahaman dan kepastian hukum dalam membaca seluruh ketentuan dalam Kebijakan Privasi ini, setiap istilah yang diawali dengan huruf kapital memiliki arti sebagaimana didefinisikan di bawah ini, kecuali apabila konteks kalimatnya secara tegas menentukan lain.',
      'Definisi berikut disusun selaras dengan terminologi yang digunakan dalam peraturan perundang-undangan pelindungan data pribadi di Indonesia serta arsitektur teknis layanan NueTify.'
    ],
    bullets: [
      {
        label: 'Data Pribadi',
        text: 'Setiap data tentang seseorang baik yang teridentifikasi maupun dapat diidentifikasi secara tersendiri atau dikombinasi dengan informasi lainnya baik secara langsung maupun tidak langsung melalui sistem elektronik atau nonelektronik.'
      },
      {
        label: 'Subjek Data / Pengguna',
        text: 'Individu atau orang perseorangan yang mengakses, membuat akun, atau menggunakan layanan NueTify melalui Web, PWA, maupun Aplikasi Android.'
      },
      {
        label: 'Layanan NueTify',
        text: 'Seluruh fitur streaming audio, manajemen pustaka musik, sinkronisasi cloud, papan peringkat pendengar (Leaderboard), import playlist, equalizer audio, serta antarmuka pengguna yang disediakan oleh PT Nueva Group.'
      },
      {
        label: 'Pengolahan / Pemrosesan Data',
        text: 'Meliputi pemerolehan dan pengumpulan, pengolahan dan penganalisisan, penyimpanan, perbaikan dan pembaruan, penampilan, pengumuman, transfer, penyebarluasan, atau pengungkapan, serta penghapusan atau pemusnahan Data Pribadi.'
      },
      {
        label: 'Mode Tamu (Guest Mode)',
        text: 'Mode penggunaan layanan NueTify tanpa masuk ke akun terdaftar, di mana preferensi dan pustaka musik disimpan secara lokal di perangkat pengguna tanpa sinkronisasi cloud.'
      }
    ]
  },
  {
    id: 'pasal-3',
    number: 'Pasal 3',
    title: 'Jenis Data Pribadi yang Kami Kumpulkan',
    paragraphs: [
      'PT Nueva Group menerapkan prinsip minimalisasi data, yang berarti kami hanya mengumpulkan Data Pribadi yang relevan, proporsional, dan benar-benar diperlukan untuk menyelenggarakan layanan streaming musik yang andal, personal, dan aman. Jenis data yang dikumpulkan bergantung pada apakah Anda menggunakan Mode Tamu atau masuk menggunakan akun NueTify.',
      'Seluruh data yang Anda berikan secara sukarela maupun yang dihasilkan secara otomatis selama interaksi Anda dengan pemutar audio dicatat secara terstruktur dalam basis data kami untuk menjaga kontinuitas pengalaman mendengarkan lintas perangkat.'
    ],
    bullets: [
      {
        label: 'Data Identitas & Autentikasi Akun',
        text: 'Alamat email aktif (saat mendaftar dengan Email/Password atau masuk melalui Google OAuth), pengenal unik pengguna (User ID/UUID), status verifikasi email, serta token sesi autentikasi terenkripsi.'
      },
      {
        label: 'Data Profil Pengguna',
        text: 'Nama Tampilan (Display Name) dengan panjang maksimal 15 karakter yang Anda tetapkan atau ubah, serta URL Foto Profil Custom yang Anda unggah atau tautkan.'
      },
      {
        label: 'Data Pustaka Musik (Library)',
        text: 'Daftar lagu yang disukai (Liked Songs), daftar putar pribadi (Playlists) beserta judul dan tag/label playlist, daftar album tersimpan (Saved Albums), serta daftar artis yang diikuti atau disimpan (Saved Artists).'
      },
      {
        label: 'Riwayat Putar, Pencarian & Statistik Dengar',
        text: 'Riwayat lagu yang diputar (Recently Played), kueri pencarian musik untuk kemudahan akses ulang, total durasi mendengarkan (listening time), serta jumlah pemutaran (play count) yang terakumulasi.'
      },
      {
        label: 'Preferensi Audio & Tampilan',
        text: 'Pengaturan equalizer (frekuensi band, bass boost, preset audio), volume pemutaran, mode pengulangan/acak, serta preferensi tampilan antarmuka (Appearance).'
      },
      {
        label: 'Data Teknis & Log Keamanan',
        text: 'Alamat IP (untuk pencegahan penyalahgunaan dan keamanan jaringan), jenis peramban atau versi Android OS, versi aplikasi/PWA, log error teknis, serta catatan audit anti-kecurangan dan status penegakan akun.'
      }
    ]
  },
  {
    id: 'pasal-4',
    number: 'Pasal 4',
    title: 'Cara Pengumpulan Data',
    paragraphs: [
      'Kami mengumpulkan Data Pribadi melalui mekanisme yang transparan dan dapat dikendalikan oleh pengguna. Anda selalu memiliki pilihan mengenai data profil apa yang ingin Anda tampilkan serta apakah Anda ingin menyinkronkan pustaka musik Anda ke cloud atau menyimpannya secara lokal saja.',
      'Pada saat Anda beralih dari Mode Tamu ke akun terdaftar, sistem kami dapat memfasilitasi migrasi atau sinkronisasi pustaka lokal Anda ke akun cloud agar koleksi musik Anda tetap terjaga.'
    ],
    bullets: [
      {
        label: 'Pengumpulan Langsung dari Pengguna',
        text: 'Informasi yang Anda ketikkan secara langsung saat membuat akun, memverifikasi email, memperbarui Nama Tampilan, menambahkan URL Foto Profil, membuat Playlist beserta Tag, atau mengimpor tautan playlist publik.'
      },
      {
        label: 'Sinkronisasi Otomatis Cloud Supabase',
        text: 'Ketika Anda masuk ke akun, aktivitas seperti menyukai lagu, menyimpan album/artis, memutar lagu, dan mengubah preferensi equalizer disinkronkan secara otomatis ke basis data cloud Supabase agar tersedia di perangkat lain.'
      },
      {
        label: 'Autentikasi Pihak Ketiga (Google OAuth)',
        text: 'Jika Anda memilih masuk dengan Google, kami menerima informasi dasar yang Anda izinkan melalui layar persetujuan Google, yaitu alamat email, nama profil awal, dan URL foto profil Google Anda.'
      },
      {
        label: 'Mode Tamu Lokal (Local-Only)',
        text: 'Saat Anda menggunakan Mode Tamu tanpa login, pustaka musik, riwayat putar, dan pengaturan equalizer hanya disimpan di penyimpanan lokal perangkat (LocalStorage/Cache) dan tidak dikirim ke profil akun cloud.'
      }
    ]
  },
  {
    id: 'pasal-5',
    number: 'Pasal 5',
    title: 'Dasar Hukum & Tujuan Pemrosesan Data',
    paragraphs: [
      'Sesuai dengan Pasal 20 UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), setiap pemrosesan Data Pribadi yang dilakukan oleh PT Nueva Group didasarkan pada dasar pemrosesan yang sah, meliputi persetujuan eksplisit Subjek Data, pemenuhan kewajiban perjanjian layanan antara pengguna dan NueTify, pemenuhan kewajiban hukum, serta kepentingan yang sah (legitimate interest) dalam menjaga keamanan dan keandalan sistem.',
      'Kami tidak pernah menjual, menyewakan, atau memperdagangkan Data Pribadi Anda kepada pengiklan pihak ketiga atau broker data mana pun.'
    ],
    bullets: [
      {
        label: 'Penyediaan & Pemeliharaan Layanan Inti',
        text: 'Memungkinkan autentikasi akun, pemutaran musik tanpa hambatan, penyimpanan pustaka musik pribadi, serta sinkronisasi lintas platform antara Web, PWA, dan Aplikasi Android.'
      },
      {
        label: 'Personalisasi Pengalaman Mendengarkan',
        text: 'Menyajikan kembali riwayat lagu terakhir diputar, menyimpan konfigurasi equalizer khusus perangkat Anda, serta menampilkan nama dan avatar pilihan Anda di antarmuka aplikasi.'
      },
      {
        label: 'Operasional Fitur Leaderboard Komunitas',
        text: 'Menghitung total durasi dengar dan jumlah putar secara akurat untuk menyusun peringkat pendengar aktif di halaman Leaderboard secara adil.'
      },
      {
        label: 'Keamanan, Anti-Kecurangan & Penegakan Ketentuan',
        text: 'Mendeteksi pola trafik anomali, mencegah manipulasi statistik atau serangan bot, memverifikasi integritas sesi, dan menegakkan sanksi penangguhan atau pemblokiran akun yang melanggar Syarat & Ketentuan.'
      },
      {
        label: 'Komunikasi Layanan & Pemeliharaan',
        text: 'Mengirimkan email verifikasi pendaftaran, pemberitahuan pemulihan kata sandi, notifikasi status pemeliharaan sistem (Maintenance Mode), atau tanggapan atas permohonan bantuan dan banding akun.'
      }
      ]
    },
  {
    id: 'pasal-6',
    number: 'Pasal 6',
    title: 'Privasi Leaderboard Publik & Perlindungan Alamat Email',
    paragraphs: [
      'NueTify menyediakan fitur Leaderboard Publik untuk merayakan aktivitas mendengarkan musik di dalam komunitas. Kami memahami bahwa privasi identitas kontak merupakan hal yang sangat sensitif; oleh karena itu, kami merancang arsitektur penyajian data Leaderboard dengan pemisahan ketat antara data privat dan data tampilan publik.',
      'Secara tegas dan eksplisit, PT Nueva Group menjamin bahwa alamat email lengkap Anda maupun bagian awal alamat email (email prefix sebelum tanda @) TIDAK PERNAH dibocorkan, dikirimkan melalui endpoint publik, atau ditampilkan pada halaman Leaderboard publik. Apabila Anda belum mengatur Nama Tampilan khusus, sistem akan menggunakan label anonim yang aman atau inisial umum yang tidak mengungkap alamat email Anda.'
    ],
    bullets: [
      {
        label: 'Data yang Ditampilkan di Leaderboard Publik',
        text: 'Hanya Nama Tampilan (Display Name, maksimal 15 karakter), URL Foto Profil (avatar), total durasi mendengarkan (listening time), jumlah pemutaran lagu (play count), serta lencana terverifikasi resmi jika berlaku.'
      },
      {
        label: 'Data yang Dirahasiakan Sepenuhnya',
        text: 'Alamat email, prefix email, pengenal autentikasi internal, riwayat pencarian pribadi, daftar lagu yang disukai, serta alamat IP tidak pernah ditampilkan kepada pengguna lain di Leaderboard.'
      },
      {
        label: 'Kendali Penuh Pengguna atas Profil Publik',
        text: 'Anda dapat mengubah Nama Tampilan dan URL Foto Profil kapan saja melalui menu Pengaturan Profil di dalam aplikasi, dan perubahan tersebut akan segera diperbarui pada tampilan Leaderboard.'
      }
    ]
  },
  {
    id: 'pasal-7',
    number: 'Pasal 7',
    title: 'Penyimpanan Data, Infrastruktur Cloud & Penyimpanan Lokal',
    paragraphs: [
      'Untuk menghadirkan kecepatan akses yang optimal bagi pengguna di Indonesia dan Asia Tenggara serta menjaga ketahanan data tingkat tinggi, seluruh Data Pribadi pengguna terdaftar disimpan pada infrastruktur cloud terkelola yang memiliki sertifikasi keamanan standar industri.',
      'Di samping penyimpanan berbasis cloud, NueTify memanfaatkan penyimpanan lokal pada perangkat pengguna untuk mendukung kemampuan offline-first pada PWA dan aplikasi Android serta mendukung Mode Tamu.'
    ],
    bullets: [
      {
        label: 'Basis Data Cloud Supabase (Wilayah Singapura)',
        text: 'Data akun, profil, pustaka musik (Liked Songs, Playlists, Tags, Saved Albums/Artists), riwayat putar, preferensi equalizer, dan statistik Leaderboard disimpan di cluster basis data Supabase yang berlokasi di wilayah Singapura (ap-southeast-1).'
      },
      {
        label: 'Hosting Aplikasi Web & Edge Network (Vercel)',
        text: 'Antarmuka web dan rute server NueTify di-hosting melalui infrastruktur Vercel Edge Network dengan proteksi TLS/HTTPS otomatis untuk memastikan lalu lintas antara peramban Anda dan server selalu terenkripsi.'
      },
      {
        label: 'Penyimpanan Lokal (LocalStorage, Cache & Android APK)',
        text: 'Pada peramban Web, PWA, dan Aplikasi Android (com.ptnuevagroup.nuetify), sebagian data seperti token sesi, cache antarmuka, preferensi equalizer lokal, dan pustaka Mode Tamu disimpan di LocalStorage atau penyimpanan internal aplikasi.'
      }
    ]
  },
  {
    id: 'pasal-8',
    number: 'Pasal 8',
    title: 'Keamanan Data, Enkripsi, RLS & Pencegahan Manipulasi',
    paragraphs: [
      'PT Nueva Group menerapkan langkah-langkah pengamanan teknis, administratif, dan organisasi yang ketat untuk melindungi Data Pribadi Anda dari akses tidak sah, pengungkapan yang melanggar hukum, perubahan tanpa izin, maupun perusakan data.',
      'Kami juga mengoperasikan sistem integritas dan anti-kecurangan untuk memastikan keadilan statistik Leaderboard serta melindungi platform dari serangan otomatis maupun penyalahgunaan API.'
    ],
    bullets: [
      {
        label: 'Enkripsi Transmisi & Penyimpanan',
        text: 'Seluruh pertukaran data menggunakan protokol HTTPS/TLS 1.2+ yang terenkripsi secara end-to-end dalam perjalanan (in-transit), sementara kredensial kata sandi di-hash menggunakan algoritma kriptografi satu arah yang aman dan data di basis data dilindungi enkripsi saat diam (at-rest).'
      },
      {
        label: 'Row Level Security (RLS) Supabase',
        text: 'Setiap tabel sensitif di basis data kami dilindungi oleh kebijakan Row Level Security (RLS) yang ketat, memastikan bahwa satu pengguna hanya dapat membaca, menulis, atau menghapus baris data pustaka musik milik dirinya sendiri yang tervalidasi oleh token JWT resmi.'
      },
      {
        label: 'Anti-Cheat, Validasi Server & Audit Logs',
        text: 'Pembaruan statistik mendengarkan divalidasi dengan batasan kewajaran durasi waktu nyata. Aktivitas mencurigakan seperti spoofing permintaan API, penggunaan bot, atau manipulasi statistik dicatat dalam Audit Logs keamanan untuk peninjauan administrator.'
      }
    ]
  },
  {
    id: 'pasal-9',
    number: 'Pasal 9',
    title: 'Pembagian Data dengan Pihak Ketiga & Integrasi Layanan Eksternal',
    paragraphs: [
      'PT Nueva Group tidak menjual Data Pribadi Anda kepada pihak ketiga mana pun. Namun, untuk menjalankan fungsi teknis utama NueTify secara andal, kami bekerja sama dengan penyedia infrastruktur tepercaya serta menyediakan fitur integrasi layanan musik eksternal atas permintaan Anda.',
      'Setiap penyedia layanan pihak ketiga yang memproses data atas nama kami terikat oleh kewajiban kerahasiaan dan standar keamanan data yang ketat.'
    ],
    bullets: [
      {
        label: 'Penyedia Infrastruktur Inti (Supabase & Vercel)',
        text: 'Memproses penyimpanan basis data, autentikasi pengguna, serta penyajian aplikasi web sesuai dengan kebijakan privasi dan keamanan masing-masing penyedia.'
      },
      {
        label: 'Google OAuth (Sign in with Google)',
        text: 'Digunakan hanya apabila Anda memilih metode masuk menggunakan akun Google. Kami tidak mengakses kontak, isi email Gmail, atau file Google Drive Anda.'
      },
      {
        label: 'Metadata YouTube Music & Import Playlist Publik Spotify',
        text: 'Saat Anda mencari lagu, memutar audio, atau menggunakan fitur Import Playlist dari tautan playlist publik Spotify atau YouTube Music, sistem kami mengambil metadata publik (judul lagu, artis, sampul album, daftar trek) tanpa meminta kata sandi akun Spotify Anda.'
      },
      {
        label: 'Kewajiban Hukum & Penegakan Hukum',
        text: 'Kami dapat mengungkapkan informasi terbatas apabila diwajibkan secara sah oleh peraturan perundang-undangan yang berlaku, perintah pengadilan, atau permintaan resmi dari otoritas penegak hukum Republik Indonesia.'
      }
    ]
  },
  {
    id: 'pasal-10',
    number: 'Pasal 10',
    title: 'Transfer Data Lintas Batas Negara',
    paragraphs: [
      'Mengingat arsitektur komputasi awan modern yang digunakan oleh NueTify, Data Pribadi Anda dapat ditransfer dan disimpan pada pusat data yang berlokasi di luar wilayah yurisdiksi Republik Indonesia, khususnya di Singapura (wilayah server Supabase) serta jaringan edge global Vercel untuk optimalisasi latensi.',
      'Dalam melaksanakan transfer Data Pribadi ke luar negeri, PT Nueva Group memastikan pemenuhan ketentuan Pasal 56 UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), yakni dengan memastikan negara tujuan atau penyedia layanan penerima memiliki tingkat pelindungan data yang setara atau lebih tinggi, atau dengan menerapkan kontrak pengamanan standar dan persetujuan eksplisit dari Anda.'
    ],
    bullets: [
      {
        label: 'Lokasi Pusat Data Utama',
        text: 'Singapura (Asia Tenggara) untuk penyimpanan basis data utama Supabase, dengan standar kepatuhan keamanan internasional seperti SOC 2 Type II dan enkripsi terkelola.'
      },
      {
        label: 'Jaminan Perlindungan Lintas Batas',
        text: 'Setiap transfer data lintas batas dilakukan melalui saluran terenkripsi dan tetap tunduk pada hak-hak Subjek Data Anda di bawah hukum Indonesia.'
      }
    ]
  },
  {
    id: 'pasal-11',
    number: 'Pasal 11',
    title: 'Jangka Waktu Penyimpanan (Retensi) & Penghapusan Data',
    paragraphs: [
      'Kami hanya menyimpan Data Pribadi Anda selama diperlukan untuk memenuhi tujuan pengumpulannya, selama akun Anda masih aktif digunakan, atau selama diwajibkan oleh ketentuan hukum yang berlaku.',
      'Apabila Anda memilih untuk berhenti menggunakan layanan atau mengajukan permohonan penghapusan akun secara permanen, kami akan menindaklanjuti penghapusan data Anda secara menyeluruh dalam jangka waktu yang wajar.'
    ],
    bullets: [
      {
        label: 'Data Akun & Pustaka Musik Aktif',
        text: 'Disimpan secara terus-menerus selama akun Anda berstatus aktif agar Anda tidak kehilangan daftar lagu, playlist, dan preferensi audio Anda.'
      },
      {
        label: 'Log Keamanan & Catatan Penegakan Akun',
        text: 'Catatan audit keamanan, riwayat pelanggaran berat, atau data pemblokiran permanen dapat disimpan untuk jangka waktu tertentu guna mencegah pendaftaran ulang yang menyalahgunakan sistem dan melindungi integritas layanan.'
      },
      {
        label: 'Proses Penghapusan Data',
        text: 'Setelah permintaan penghapusan akun diverifikasi, Data Pribadi utama Anda akan dihapus atau dianonimkan secara permanen dari basis data aktif dalam waktu maksimal 30 (tiga puluh) hari kalender, kecuali data tertentu yang wajib disimpan menurut hukum.'
      }
    ]
  },
        {
    id: 'pasal-12',
    number: 'Pasal 12',
    title: 'Hak-Hak Subjek Data Pribadi',
    paragraphs: [
      'Berdasarkan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), Anda sebagai Subjek Data memiliki hak hukum penuh atas Data Pribadi Anda yang kami kelola. PT Nueva Group menyediakan mekanisme langsung di dalam aplikasi maupun melalui kontak resmi DPO untuk memfasilitasi pelaksanaan hak-hak tersebut.',
      'Kami akan merespons setiap permintaan pelaksanaan hak Subjek Data yang terverifikasi sesuai tenggat waktu yang diatur oleh peraturan perundang-undangan yang berlaku.'
    ],
    bullets: [
      {
        label: 'Hak Akses & Kejelasan Informasi',
        text: 'Anda berhak memperoleh informasi mengenai kejelasan identitas pengelola, dasar kepentingan hukum, tujuan pemrosesan, serta mendapatkan salinan Data Pribadi Anda yang tersimpan di akun NueTify.'
      },
      {
        label: 'Hak Koreksi & Pembaruan Profil',
        text: 'Anda berhak melengkapi, memperbarui, dan/atau memperbaiki kesalahan atau ketidakakuratan Data Pribadi, termasuk mengubah Nama Tampilan dan URL Foto Profil secara langsung.'
      },
      {
        label: 'Hak Penghapusan (Right to Erasure)',
        text: 'Anda berhak meminta pengakhiran pemrosesan, penghapusan, dan/atau pemusnahan Data Pribadi Anda secara permanen apabila tidak lagi ingin menggunakan layanan NueTify.'
      },
      {
        label: 'Hak Pembatasan Pemrosesan & Penarikan Persetujuan',
        text: 'Anda berhak menarik kembali persetujuan pemrosesan Data Pribadi atau meminta pembatasan pemrosesan dalam kondisi tertentu sesuai ketentuan UU PDP.'
      },
      {
        label: 'Hak Portabilitas Data',
        text: 'Anda berhak mendapatkan dan/atau menggunakan Data Pribadi Anda dalam bentuk yang terstruktur serta lazim digunakan untuk dibaca oleh sistem elektronik.'
      }
    ]
  },
  {
    id: 'pasal-13',
    number: 'Pasal 13',
    title: 'Cookie, Web Storage, PWA Cache & Izin Aplikasi Android',
    paragraphs: [
      'NueTify tidak menggunakan cookie pelacakan iklan pihak ketiga yang memantau aktivitas penjelajahan Anda di situs web lain. Kami hanya menggunakan mekanisme penyimpanan peramban yang esensial untuk menjaga sesi login Anda tetap aktif dan memastikan pemutaran audio berjalan lancar.',
      'Untuk pengguna Aplikasi Android resmi NueTify (com.ptnuevagroup.nuetify), aplikasi hanya meminta izin sistem operasi yang relevan dengan fungsi pemutar musik dan manajemen profil.'
    ],
    bullets: [
      {
        label: 'Cookie Esensial & Web Storage (LocalStorage)',
        text: 'Digunakan untuk menyimpan token sesi autentikasi Supabase, status Mode Tamu, daftar antrean lagu (queue), serta pengaturan equalizer lokal.'
      },
      {
        label: 'PWA Service Worker & Cache',
        text: 'Progressive Web App NueTify menyimpan aset antarmuka statis (ikon, stylesheet, skrip) di cache lokal agar aplikasi dapat dibuka dengan cepat dan stabil bahkan saat koneksi internet tidak stabil.'
      },
      {
        label: 'Izin Aplikasi Android (Notifikasi Media & Foreground Service)',
        text: 'Aplikasi Android memerlukan izin Foreground Service Audio dan Notifikasi Media agar musik tetap dapat diputar di latar belakang (background playback) serta menampilkan kontrol putar/jeda di layar kunci perangkat.'
      },
      {
        label: 'Izin Penyimpanan Gambar / Pembaruan APK',
        text: 'Akses penyimpanan atau pemilih berkas hanya diminta saat Anda secara aktif memilih gambar profil atau mengunduh pembaruan paket aplikasi (APK) resmi.'
      }
    ]
  },
  {
    id: 'pasal-14',
    number: 'Pasal 14',
    title: 'Privasi Anak & Batasan Usia Pengguna',
    paragraphs: [
      'Layanan NueTify ditujukan bagi pengguna umum yang telah memenuhi usia cakap hukum atau berusia minimal 13 (tiga belas) tahun. Apabila Anda berada di bawah usia dewasa menurut hukum di yurisdiksi Anda (di bawah 18 tahun atau belum menikah menurut hukum Indonesia), Anda wajib menggunakan layanan NueTify dengan sepengetahuan, persetujuan, dan pengawasan orang tua atau wali yang sah.',
      'PT Nueva Group tidak secara sengaja mengumpulkan Data Pribadi dari anak di bawah usia 13 tahun tanpa persetujuan sah dari orang tua atau wali. Jika kami mengetahui adanya pengumpulan data anak tanpa izin yang sah, kami akan segera mengambil langkah untuk menghapus data tersebut dari sistem kami.'
    ],
    bullets: [
      {
        label: 'Keterlibatan Orang Tua / Wali',
        text: 'Orang tua atau wali yang sah dapat menghubungi Petugas Pelindungan Data (DPO) kami apabila mengetahui anak di bawah pengawasannya telah mendaftarkan akun tanpa persetujuan.'
      },
      {
        label: 'Penghapusan Segera',
        text: 'Setelah laporan diverifikasi, akun dan seluruh data terkait akan dinonaktifkan dan dihapus secara permanen dari basis data kami.'
      }
    ]
  },
  {
    id: 'pasal-15',
    number: 'Pasal 15',
    title: 'Perubahan Kebijakan Privasi & Pemberitahuan Real-Time',
    paragraphs: [
      'Seiring berkembangnya fitur layanan NueTify, teknologi keamanan, serta pembaruan peraturan perundang-undangan di Republik Indonesia, PT Nueva Group dapat meninjau dan memperbarui Kebijakan Privasi ini dari waktu ke waktu.',
      'Setiap perubahan akan disertai pembaruan tanggal pada bagian atas halaman ini. Untuk perubahan yang bersifat material terhadap cara kami mengumpulkan atau menggunakan Data Pribadi, kami akan menyampaikan pemberitahuan secara jelas melalui notifikasi di dalam aplikasi (real-time banner/modal) atau melalui alamat email terdaftar Anda sebelum perubahan tersebut berlaku efektif.'
    ],
    bullets: [
      {
        label: 'Riwayat Versi & Tanggal Efektif',
        text: 'Tanggal pembaruan terakhir selalu dicantumkan secara eksplisit di bagian atas dokumen agar Anda dapat memantau revisi terbaru.'
      },
      {
        label: 'Persetujuan Berkelanjutan',
        text: 'Dengan terus mengakses atau menggunakan NueTify setelah pembaruan Kebijakan Privasi berlaku efektif, Anda dianggap telah membaca dan menyetujui versi kebijakan yang diperbarui.'
      }
    ]
  },
  {
    id: 'pasal-16',
    number: 'Pasal 16',
    title: 'Informasi Kontak Resmi Petugas Pelindungan Data (DPO)',
    paragraphs: [
      'Apabila Anda memiliki pertanyaan, keluhan, permintaan akses atau penghapusan Data Pribadi, maupun laporan terkait dugaan insiden keamanan privasi pada ekosistem layanan NueTify, Anda dapat menghubungi Petugas Pelindungan Data (Data Protection Officer / DPO) PT Nueva Group secara langsung melalui saluran resmi di bawah ini.',
      'Demi keamanan dan untuk mencegah akses tidak sah oleh pihak lain, kami dapat meminta verifikasi identitas kepemilikan akun sebelum memproses permohonan terkait Data Pribadi Anda.'
    ],
    bullets: [
      {
        label: 'Entitas Pengelola',
        text: 'PT Nueva Group — Indonesia'
      },
      {
        label: 'Email Resmi DPO & Privasi',
        text: 'drevviann@gmail.com'
      },
      {
        label: 'Subjek Email yang Disarankan',
        text: '[Privasi NueTify] Permohonan Hak Subjek Data / Pertanyaan Kebijakan Privasi'
      }
    ]
  }
];
      
export default function PrivacyPolicyPage() {
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
              Kebijakan Privasi
            </span>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C0C0C0]/15 bg-[#181818] px-4 py-2 text-xs font-medium text-[#A7A7A7] transition hover:border-[#C0C0C0]/40 hover:text-[#E5E5E5]"
            >
              <span>Syarat &amp; Ketentuan</span>
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
            Kebijakan Privasi NueTify
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#A7A7A7] sm:text-base">
            Terakhir Diperbarui: 23 November 2026 &middot; Berlaku Efektif untuk Web, PWA, dan Aplikasi Android NueTify
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#A7A7A7]">
            Dokumen ini menjelaskan komitmen PT Nueva Group dalam melindungi privasi dan Data Pribadi seluruh pengguna layanan streaming musik NueTify sesuai dengan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) Republik Indonesia.
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

        {/* 16 Pasal Kebijakan Privasi */}
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
              href="/terms"
              className="rounded-full border border-[#C0C0C0]/15 bg-[#121212] px-4 py-2 text-xs font-medium text-[#C0C0C0] transition hover:border-[#C0C0C0]/40 hover:text-[#E5E5E5]"
            >
              Baca Syarat &amp; Ketentuan
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
