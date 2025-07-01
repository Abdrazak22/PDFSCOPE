import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Language configuration
const SUPPORTED_LANGUAGES = {
  en: "English",
  zh: "中文 (Chinese)",
  es: "Español",
  hi: "हिन्दी (Hindi)",
  ar: "العربية (Arabic)",
  pt: "Português",
  ru: "Русский",
  ja: "日本語 (Japanese)",
  de: "Deutsch",
  fr: "Français",
  ko: "한국어 (Korean)"
};

// Complete translations for the entire interface
const TRANSLATIONS = {
  en: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI-Powered PDF Discovery",
    
    // Navigation
    features: "Features",
    about: "About",
    help: "Help",
    language: "Language",
    
    // Search interface
    searchPlaceholder: "Search millions of PDFs worldwide...",
    searchButton: "Search",
    searching: "Searching",
    
    // Filters
    filterByYear: "Filter by Year",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025", 
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "results",
    foundIn: "found in",
    seconds: "seconds",
    noResults: "No PDFs found",
    tryDifferent: "Try different keywords or adjust your filters",
    
    // Actions
    readPdf: "Read PDF",
    download: "Download",
    viewSource: "View Source",
    close: "Close",
    
    // Content
    aiSummary: "AI Summary",
    relatedSearches: "Related Searches",
    publicationDate: "Publication Date",
    domain: "Domain",
    fileSize: "File Size",
    
    // Welcome section
    welcomeTitle: "Search 50+ Million PDFs",
    welcomeSubtitle: "Discover research papers, academic publications, and documents from 1975-2025 with our AI-powered search engine. Get instant access to the world's knowledge.",
    
    // Features
    googlePoweredTitle: "Google-Powered Search",
    googlePoweredDesc: "Access millions of PDFs through Google's comprehensive index with advanced filtering.",
    yearsKnowledgeTitle: "50 Years of Knowledge", 
    yearsKnowledgeDesc: "Explore documents from 1975 to 2025, with the most recent publications prioritized first.",
    aiEnhancedTitle: "AI-Enhanced Discovery",
    aiEnhancedDesc: "Smart query optimization and automatic summaries for better research outcomes.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Direct PDF viewing not available",
    pdfViewerMessage: "This document needs to be viewed on the original source.",
    viewOnSource: "View on",
    
    // Error messages
    searchFailed: "Search failed. Please try again.",
    loadingError: "Failed to load content",
    
    // Stats
    millionsLabel: "Millions",
    pdfDocuments: "PDF Documents",
    recentFocus: "Recent Focus",
    aiPoweredLabel: "AI-Powered",
    smartSearch: "Smart Search"
  },
  
  ar: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "اكتشاف PDF مدعوم بالذكاء الاصطناعي",
    
    // Navigation
    features: "الميزات",
    about: "حول",
    help: "مساعدة",
    language: "اللغة",
    
    // Search interface
    searchPlaceholder: "ابحث في ملايين ملفات PDF حول العالم...",
    searchButton: "بحث",
    searching: "جاري البحث",
    
    // Filters
    filterByYear: "تصفية حسب السنة",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025", 
    yearRange1975: "1975-2025",
    
    // Results
    results: "نتائج",
    foundIn: "وجدت في",
    seconds: "ثواني",
    noResults: "لم يتم العثور على ملفات PDF",
    tryDifferent: "جرب كلمات مفتاحية مختلفة أو اضبط المرشحات",
    
    // Actions
    readPdf: "قراءة PDF",
    download: "تحميل",
    viewSource: "عرض المصدر",
    close: "إغلاق",
    
    // Content
    aiSummary: "ملخص الذكاء الاصطناعي",
    relatedSearches: "عمليات بحث ذات صلة",
    publicationDate: "تاريخ النشر",
    domain: "النطاق",
    fileSize: "حجم الملف",
    
    // Welcome section
    welcomeTitle: "ابحث في أكثر من 50 مليون PDF",
    welcomeSubtitle: "اكتشف الأوراق البحثية والمنشورات الأكاديمية والوثائق من 1975-2025 باستخدام محرك البحث المدعوم بالذكاء الاصطناعي. احصل على وصول فوري إلى المعرفة العالمية.",
    
    // Features
    googlePoweredTitle: "بحث مدعوم بجوجل",
    googlePoweredDesc: "الوصول إلى ملايين ملفات PDF من خلال فهرس جوجل الشامل مع التصفية المتقدمة.",
    yearsKnowledgeTitle: "50 عاماً من المعرفة",
    yearsKnowledgeDesc: "استكشف الوثائق من 1975 إلى 2025، مع إعطاء الأولوية للمنشورات الأحدث أولاً.",
    aiEnhancedTitle: "اكتشاف محسن بالذكاء الاصطناعي",
    aiEnhancedDesc: "تحسين الاستعلام الذكي والملخصات التلقائية لنتائج بحث أفضل.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "عرض PDF المباشر غير متاح",
    pdfViewerMessage: "يجب عرض هذه الوثيقة على المصدر الأصلي.",
    viewOnSource: "عرض على",
    
    // Error messages
    searchFailed: "فشل البحث. الرجاء المحاولة مرة أخرى.",
    loadingError: "فشل في تحميل المحتوى",
    
    // Stats
    millionsLabel: "ملايين",
    pdfDocuments: "وثائق PDF",
    recentFocus: "التركيز الحديث",
    aiPoweredLabel: "مدعوم بالذكاء الاصطناعي",
    smartSearch: "بحث ذكي"
  },
  
  zh: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI驱动的PDF发现",
    
    // Navigation
    features: "功能",
    about: "关于",
    help: "帮助",
    language: "语言",
    
    // Search interface
    searchPlaceholder: "搜索全球数百万份PDF文档...",
    searchButton: "搜索",
    searching: "搜索中",
    
    // Filters
    filterByYear: "按年份筛选",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "结果",
    foundIn: "找到于",
    seconds: "秒",
    noResults: "未找到PDF",
    tryDifferent: "尝试不同的关键词或调整筛选器",
    
    // Actions
    readPdf: "阅读PDF",
    download: "下载",
    viewSource: "查看源",
    close: "关闭",
    
    // Content
    aiSummary: "AI摘要",
    relatedSearches: "相关搜索",
    publicationDate: "发布日期",
    domain: "域名",
    fileSize: "文件大小",
    
    // Welcome section
    welcomeTitle: "搜索5000万+PDF文档",
    welcomeSubtitle: "使用我们的AI驱动搜索引擎发现1975-2025年的研究论文、学术出版物和文档。即时访问世界知识。",
    
    // Features
    googlePoweredTitle: "Google驱动搜索",
    googlePoweredDesc: "通过Google的综合索引访问数百万PDF，具有高级过滤功能。",
    yearsKnowledgeTitle: "50年知识",
    yearsKnowledgeDesc: "探索1975年至2025年的文档，最新出版物优先显示。",
    aiEnhancedTitle: "AI增强发现",
    aiEnhancedDesc: "智能查询优化和自动摘要，获得更好的研究结果。",
    
    // PDF Viewer
    pdfViewerNotAvailable: "无法直接查看PDF",
    pdfViewerMessage: "此文档需要在原始来源查看。",
    viewOnSource: "在此查看",
    
    // Error messages
    searchFailed: "搜索失败。请重试。",
    loadingError: "加载内容失败",
    
    // Stats
    millionsLabel: "百万",
    pdfDocuments: "PDF文档",
    recentFocus: "近期重点",
    aiPoweredLabel: "AI驱动",
    smartSearch: "智能搜索"
  },
  
  es: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "Descubrimiento de PDF impulsado por IA",
    
    // Navigation
    features: "Características",
    about: "Acerca de",
    help: "Ayuda",
    language: "Idioma",
    
    // Search interface
    searchPlaceholder: "Buscar millones de PDFs en todo el mundo...",
    searchButton: "Buscar",
    searching: "Buscando",
    
    // Filters
    filterByYear: "Filtrar por Año",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "resultados",
    foundIn: "encontrado en",
    seconds: "segundos",
    noResults: "No se encontraron PDFs",
    tryDifferent: "Prueba palabras clave diferentes o ajusta tus filtros",
    
    // Actions
    readPdf: "Leer PDF",
    download: "Descargar",
    viewSource: "Ver Fuente",
    close: "Cerrar",
    
    // Content
    aiSummary: "Resumen IA",
    relatedSearches: "Búsquedas Relacionadas",
    publicationDate: "Fecha de Publicación",
    domain: "Dominio",
    fileSize: "Tamaño del Archivo",
    
    // Welcome section
    welcomeTitle: "Buscar 50+ Millones de PDFs",
    welcomeSubtitle: "Descubre trabajos de investigación, publicaciones académicas y documentos de 1975-2025 con nuestro motor de búsqueda impulsado por IA. Obtén acceso instantáneo al conocimiento mundial.",
    
    // Features
    googlePoweredTitle: "Búsqueda Impulsada por Google",
    googlePoweredDesc: "Accede a millones de PDFs a través del índice integral de Google con filtrado avanzado.",
    yearsKnowledgeTitle: "50 Años de Conocimiento",
    yearsKnowledgeDesc: "Explora documentos de 1975 a 2025, con las publicaciones más recientes priorizadas primero.",
    aiEnhancedTitle: "Descubrimiento Mejorado por IA",
    aiEnhancedDesc: "Optimización inteligente de consultas y resúmenes automáticos para mejores resultados de investigación.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Visualización directa de PDF no disponible",
    pdfViewerMessage: "Este documento necesita ser visto en la fuente original.",
    viewOnSource: "Ver en",
    
    // Error messages
    searchFailed: "Búsqueda fallida. Por favor intenta de nuevo.",
    loadingError: "Error al cargar contenido",
    
    // Stats
    millionsLabel: "Millones",
    pdfDocuments: "Documentos PDF",
    recentFocus: "Enfoque Reciente",
    aiPoweredLabel: "Impulsado por IA",
    smartSearch: "Búsqueda Inteligente"
  },
  
  hi: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI-संचालित PDF खोज",
    
    // Navigation
    features: "विशेषताएं",
    about: "के बारे में",
    help: "सहायता",
    language: "भाषा",
    
    // Search interface
    searchPlaceholder: "दुनिया भर में लाखों PDF खोजें...",
    searchButton: "खोजें",
    searching: "खोज रहे हैं",
    
    // Filters
    filterByYear: "वर्ष के अनुसार फ़िल्टर करें",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "परिणाम",
    foundIn: "में मिला",
    seconds: "सेकंड",
    noResults: "कोई PDF नहीं मिला",
    tryDifferent: "अलग कीवर्ड आज़माएं या अपने फ़िल्टर समायोजित करें",
    
    // Actions
    readPdf: "PDF पढ़ें",
    download: "डाउनलोड",
    viewSource: "स्रोत देखें",
    close: "बंद करें",
    
    // Content
    aiSummary: "AI सारांश",
    relatedSearches: "संबंधित खोजें",
    publicationDate: "प्रकाशन तिथि",
    domain: "डोमेन",
    fileSize: "फ़ाइल आकार",
    
    // Welcome section
    welcomeTitle: "5 करोड़+ PDF खोजें",
    welcomeSubtitle: "हमारे AI-संचालित खोज इंजन के साथ 1975-2025 के अनुसंधान पत्र, शैक्षणिक प्रकाशन और दस्तावेज़ खोजें। विश्व ज्ञान तक तत्काल पहुंच प्राप्त करें।",
    
    // Features
    googlePoweredTitle: "Google-संचालित खोज",
    googlePoweredDesc: "उन्नत फ़िल्टरिंग के साथ Google के व्यापक सूचकांक के माध्यम से लाखों PDF तक पहुंचें।",
    yearsKnowledgeTitle: "50 साल का ज्ञान",
    yearsKnowledgeDesc: "1975 से 2025 तक के दस्तावेज़ों का अन्वेषण करें, सबसे हाल के प्रकाशनों को पहले प्राथमिकता दी गई है।",
    aiEnhancedTitle: "AI-संवर्धित खोज",
    aiEnhancedDesc: "बेहतर अनुसंधान परिणामों के लिए स्मार्ट क्वेरी अनुकूलन और स्वचालित सारांश।",
    
    // PDF Viewer
    pdfViewerNotAvailable: "प्रत्यक्ष PDF देखना उपलब्ध नहीं",
    pdfViewerMessage: "इस दस्तावेज़ को मूल स्रोत पर देखा जाना चाहिए।",
    viewOnSource: "पर देखें",
    
    // Error messages
    searchFailed: "खोज असफल। कृपया पुनः प्रयास करें।",
    loadingError: "सामग्री लोड करने में विफल",
    
    // Stats
    millionsLabel: "लाखों",
    pdfDocuments: "PDF दस्तावेज़",
    recentFocus: "हाल का फोकस",
    aiPoweredLabel: "AI-संचालित",
    smartSearch: "स्मार्ट खोज"
  },
  
  pt: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "Descoberta de PDF Impulsionada por IA",
    
    // Navigation
    features: "Recursos",
    about: "Sobre",
    help: "Ajuda",
    language: "Idioma",
    
    // Search interface
    searchPlaceholder: "Pesquisar milhões de PDFs mundialmente...",
    searchButton: "Pesquisar",
    searching: "Pesquisando",
    
    // Filters
    filterByYear: "Filtrar por Ano",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "resultados",
    foundIn: "encontrado em",
    seconds: "segundos",
    noResults: "Nenhum PDF encontrado",
    tryDifferent: "Tente palavras-chave diferentes ou ajuste seus filtros",
    
    // Actions
    readPdf: "Ler PDF",
    download: "Baixar",
    viewSource: "Ver Fonte",
    close: "Fechar",
    
    // Content
    aiSummary: "Resumo IA",
    relatedSearches: "Pesquisas Relacionadas",
    publicationDate: "Data de Publicação",
    domain: "Domínio",
    fileSize: "Tamanho do Arquivo",
    
    // Welcome section
    welcomeTitle: "Pesquisar 50+ Milhões de PDFs",
    welcomeSubtitle: "Descubra artigos de pesquisa, publicações acadêmicas e documentos de 1975-2025 com nosso mecanismo de busca impulsionado por IA. Obtenha acesso instantâneo ao conhecimento mundial.",
    
    // Features
    googlePoweredTitle: "Pesquisa Impulsionada pelo Google",
    googlePoweredDesc: "Acesse milhões de PDFs através do índice abrangente do Google com filtragem avançada.",
    yearsKnowledgeTitle: "50 Anos de Conhecimento",
    yearsKnowledgeDesc: "Explore documentos de 1975 a 2025, com as publicações mais recentes priorizadas primeiro.",
    aiEnhancedTitle: "Descoberta Aprimorada por IA",
    aiEnhancedDesc: "Otimização inteligente de consultas e resumos automáticos para melhores resultados de pesquisa.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Visualização direta de PDF não disponível",
    pdfViewerMessage: "Este documento precisa ser visto na fonte original.",
    viewOnSource: "Ver em",
    
    // Error messages
    searchFailed: "Pesquisa falhou. Por favor, tente novamente.",
    loadingError: "Falha ao carregar conteúdo",
    
    // Stats
    millionsLabel: "Milhões",
    pdfDocuments: "Documentos PDF",
    recentFocus: "Foco Recente",
    aiPoweredLabel: "Impulsionado por IA",
    smartSearch: "Pesquisa Inteligente"
  },

  hi: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI-संचालित PDF खोज",
    
    // Navigation
    features: "विशेषताएं",
    about: "हमारे बारे में",
    help: "सहायता",
    language: "भाषा",
    
    // Search interface
    searchPlaceholder: "दुनिया भर में लाखों PDFs खोजें...",
    searchButton: "खोजें",
    searching: "खोज रहे हैं",
    
    // Filters
    filterByYear: "वर्ष के अनुसार फ़िल्टर करें",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "परिणाम",
    foundIn: "में मिला",
    seconds: "सेकंड",
    noResults: "कोई PDF नहीं मिला",
    tryDifferent: "अलग कीवर्ड आज़माएं या अपने फ़िल्टर समायोजित करें",
    
    // Actions
    readPdf: "PDF पढ़ें",
    download: "डाउनलोड",
    viewSource: "स्रोत देखें",
    close: "बंद करें",
    
    // Content
    aiSummary: "AI सारांश",
    relatedSearches: "संबंधित खोजें",
    publicationDate: "प्रकाशन तिथि",
    domain: "डोमेन",
    fileSize: "फ़ाइल का आकार",
    
    // Welcome section
    welcomeTitle: "50+ मिलियन PDFs खोजें",
    welcomeSubtitle: "हमारे AI-संचालित खोज इंजन के साथ 1975-2025 के अनुसंधान पत्र, शैक्षणिक प्रकाशन और दस्तावेज़ खोजें। विश्व ज्ञान तक तत्काल पहुंच प्राप्त करें।",
    
    // Features
    googlePoweredTitle: "Google-संचालित खोज",
    googlePoweredDesc: "उन्नत फ़िल्टरिंग के साथ Google के व्यापक सूचकांक के माध्यम से लाखों PDFs तक पहुंचें।",
    yearsKnowledgeTitle: "50 साल का ज्ञान",
    yearsKnowledgeDesc: "1975 से 2025 तक के दस्तावेज़ों का अन्वेषण करें, नवीनतम प्रकाशनों को पहले प्राथमिकता दी गई है।",
    aiEnhancedTitle: "AI-संवर्धित खोज",
    aiEnhancedDesc: "बेहतर अनुसंधान परिणामों के लिए स्मार्ट क्वेरी अनुकूलन और स्वचालित सारांश।",
    
    // PDF Viewer
    pdfViewerNotAvailable: "प्रत्यक्ष PDF देखना उपलब्ध नहीं है",
    pdfViewerMessage: "इस दस्तावेज़ को मूल स्रोत पर देखा जाना चाहिए।",
    viewOnSource: "इस पर देखें",
    
    // Error messages
    searchFailed: "खोज असफल हुई। कृपया पुनः प्रयास करें।",
    loadingError: "सामग्री लोड करने में विफल",
    
    // Stats
    millionsLabel: "मिलियन",
    pdfDocuments: "PDF दस्तावेज़",
    recentFocus: "हाल की फोकस",
    aiPoweredLabel: "AI-संचालित",
    smartSearch: "स्मार्ट खोज"
  },

  ru: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "ИИ-поиск PDF документов",
    
    // Navigation
    features: "Возможности",
    about: "О нас",
    help: "Помощь",
    language: "Язык",
    
    // Search interface
    searchPlaceholder: "Поиск миллионов PDF по всему миру...",
    searchButton: "Поиск",
    searching: "Поиск",
    
    // Filters
    filterByYear: "Фильтр по году",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "результатов",
    foundIn: "найдено за",
    seconds: "секунд",
    noResults: "PDF не найдены",
    tryDifferent: "Попробуйте другие ключевые слова или настройте фильтры",
    
    // Actions
    readPdf: "Читать PDF",
    download: "Скачать",
    viewSource: "Просмотр источника",
    close: "Закрыть",
    
    // Content
    aiSummary: "ИИ Резюме",
    relatedSearches: "Похожие поиски",
    publicationDate: "Дата публикации",
    domain: "Домен",
    fileSize: "Размер файла",
    
    // Welcome section
    welcomeTitle: "Поиск 50+ миллионов PDF",
    welcomeSubtitle: "Откройте исследовательские работы, академические публикации и документы 1975-2025 годов с помощью нашей поисковой системы на базе ИИ. Получите мгновенный доступ к мировым знаниям.",
    
    // Features
    googlePoweredTitle: "Поиск на базе Google",
    googlePoweredDesc: "Доступ к миллионам PDF через комплексный индекс Google с расширенной фильтрацией.",
    yearsKnowledgeTitle: "50 лет знаний",
    yearsKnowledgeDesc: "Исследуйте документы с 1975 по 2025 год, новейшие публикации в приоритете.",
    aiEnhancedTitle: "ИИ-улучшенный поиск",
    aiEnhancedDesc: "Умная оптимизация запросов и автоматические резюме для лучших результатов исследований.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Прямой просмотр PDF недоступен",
    pdfViewerMessage: "Этот документ нужно просматривать на исходном источнике.",
    viewOnSource: "Посмотреть на",
    
    // Error messages
    searchFailed: "Поиск не удался. Попробуйте еще раз.",
    loadingError: "Не удалось загрузить содержимое",
    
    // Stats
    millionsLabel: "Миллионов",
    pdfDocuments: "PDF документов",
    recentFocus: "Недавний фокус",
    aiPoweredLabel: "На базе ИИ",
    smartSearch: "Умный поиск"
  },

  ja: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI駆動のPDF発見",
    
    // Navigation
    features: "機能",
    about: "について",
    help: "ヘルプ",
    language: "言語",
    
    // Search interface
    searchPlaceholder: "世界中の数百万のPDFを検索...",
    searchButton: "検索",
    searching: "検索中",
    
    // Filters
    filterByYear: "年で絞り込み",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "件の結果",
    foundIn: "で見つかりました",
    seconds: "秒",
    noResults: "PDFが見つかりませんでした",
    tryDifferent: "異なるキーワードを試すか、フィルターを調整してください",
    
    // Actions
    readPdf: "PDFを読む",
    download: "ダウンロード",
    viewSource: "ソースを表示",
    close: "閉じる",
    
    // Content
    aiSummary: "AI要約",
    relatedSearches: "関連検索",
    publicationDate: "発行日",
    domain: "ドメイン",
    fileSize: "ファイルサイズ",
    
    // Welcome section
    welcomeTitle: "5000万以上のPDFを検索",
    welcomeSubtitle: "AI駆動の検索エンジンで1975-2025年の研究論文、学術出版物、文書を発見してください。世界の知識に即座にアクセスできます。",
    
    // Features
    googlePoweredTitle: "Google駆動検索",
    googlePoweredDesc: "高度なフィルタリングでGoogleの包括的なインデックスを通じて数百万のPDFにアクセス。",
    yearsKnowledgeTitle: "50年の知識",
    yearsKnowledgeDesc: "1975年から2025年までの文書を探索し、最新の出版物が最初に優先されます。",
    aiEnhancedTitle: "AI強化発見",
    aiEnhancedDesc: "より良い研究結果のためのスマートなクエリ最適化と自動要約。",
    
    // PDF Viewer
    pdfViewerNotAvailable: "直接PDF表示は利用できません",
    pdfViewerMessage: "この文書は元のソースで表示する必要があります。",
    viewOnSource: "で表示",
    
    // Error messages
    searchFailed: "検索に失敗しました。もう一度お試しください。",
    loadingError: "コンテンツの読み込みに失敗しました",
    
    // Stats
    millionsLabel: "百万",
    pdfDocuments: "PDF文書",
    recentFocus: "最近の焦点",
    aiPoweredLabel: "AI駆動",
    smartSearch: "スマート検索"
  },

  de: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "KI-gesteuerte PDF-Entdeckung",
    
    // Navigation
    features: "Funktionen",
    about: "Über uns",
    help: "Hilfe",
    language: "Sprache",
    
    // Search interface
    searchPlaceholder: "Millionen von PDFs weltweit durchsuchen...",
    searchButton: "Suchen",
    searching: "Suche läuft",
    
    // Filters
    filterByYear: "Nach Jahr filtern",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "Ergebnisse",
    foundIn: "gefunden in",
    seconds: "Sekunden",
    noResults: "Keine PDFs gefunden",
    tryDifferent: "Versuchen Sie andere Schlüsselwörter oder passen Sie Ihre Filter an",
    
    // Actions
    readPdf: "PDF lesen",
    download: "Herunterladen",
    viewSource: "Quelle anzeigen",
    close: "Schließen",
    
    // Content
    aiSummary: "KI-Zusammenfassung",
    relatedSearches: "Verwandte Suchen",
    publicationDate: "Veröffentlichungsdatum",
    domain: "Domain",
    fileSize: "Dateigröße",
    
    // Welcome section
    welcomeTitle: "50+ Millionen PDFs durchsuchen",
    welcomeSubtitle: "Entdecken Sie Forschungsarbeiten, wissenschaftliche Publikationen und Dokumente von 1975-2025 mit unserer KI-gesteuerten Suchmaschine. Erhalten Sie sofortigen Zugang zum Weltwissen.",
    
    // Features
    googlePoweredTitle: "Google-gesteuerte Suche",
    googlePoweredDesc: "Zugriff auf Millionen von PDFs über Googles umfassenden Index mit erweiteter Filterung.",
    yearsKnowledgeTitle: "50 Jahre Wissen",
    yearsKnowledgeDesc: "Erkunden Sie Dokumente von 1975 bis 2025, neueste Publikationen werden zuerst priorisiert.",
    aiEnhancedTitle: "KI-verbesserte Entdeckung",
    aiEnhancedDesc: "Intelligente Abfrageoptimierung und automatische Zusammenfassungen für bessere Forschungsergebnisse.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Direkte PDF-Anzeige nicht verfügbar",
    pdfViewerMessage: "Dieses Dokument muss an der ursprünglichen Quelle angezeigt werden.",
    viewOnSource: "Anzeigen auf",
    
    // Error messages
    searchFailed: "Suche fehlgeschlagen. Bitte versuchen Sie es erneut.",
    loadingError: "Fehler beim Laden des Inhalts",
    
    // Stats
    millionsLabel: "Millionen",
    pdfDocuments: "PDF-Dokumente",
    recentFocus: "Aktueller Fokus",
    aiPoweredLabel: "KI-gesteuert",
    smartSearch: "Intelligente Suche"
  },

  fr: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "Découverte de PDF alimentée par IA",
    
    // Navigation
    features: "Fonctionnalités",
    about: "À propos",
    help: "Aide",
    language: "Langue",
    
    // Search interface
    searchPlaceholder: "Rechercher des millions de PDFs dans le monde...",
    searchButton: "Rechercher",
    searching: "Recherche en cours",
    
    // Filters
    filterByYear: "Filtrer par année",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "résultats",
    foundIn: "trouvé en",
    seconds: "secondes",
    noResults: "Aucun PDF trouvé",
    tryDifferent: "Essayez d'autres mots-clés ou ajustez vos filtres",
    
    // Actions
    readPdf: "Lire le PDF",
    download: "Télécharger",
    viewSource: "Voir la source",
    close: "Fermer",
    
    // Content
    aiSummary: "Résumé IA",
    relatedSearches: "Recherches liées",
    publicationDate: "Date de publication",
    domain: "Domaine",
    fileSize: "Taille du fichier",
    
    // Welcome section
    welcomeTitle: "Rechercher 50+ millions de PDFs",
    welcomeSubtitle: "Découvrez des articles de recherche, des publications académiques et des documents de 1975-2025 avec notre moteur de recherche alimenté par IA. Obtenez un accès instantané aux connaissances mondiales.",
    
    // Features
    googlePoweredTitle: "Recherche alimentée par Google",
    googlePoweredDesc: "Accédez à des millions de PDFs via l'index complet de Google avec filtrage avancé.",
    yearsKnowledgeTitle: "50 ans de connaissances",
    yearsKnowledgeDesc: "Explorez les documents de 1975 à 2025, les publications les plus récentes sont priorisées en premier.",
    aiEnhancedTitle: "Découverte améliorée par IA",
    aiEnhancedDesc: "Optimisation intelligente des requêtes et résumés automatiques pour de meilleurs résultats de recherche.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "Affichage direct du PDF non disponible",
    pdfViewerMessage: "Ce document doit être consulté sur la source originale.",
    viewOnSource: "Voir sur",
    
    // Error messages
    searchFailed: "Recherche échouée. Veuillez réessayer.",
    loadingError: "Échec du chargement du contenu",
    
    // Stats
    millionsLabel: "Millions",
    pdfDocuments: "Documents PDF",
    recentFocus: "Focus récent",
    aiPoweredLabel: "Alimenté par IA",
    smartSearch: "Recherche intelligente"
  },

  ko: {
    // Site branding
    siteTitle: "PDFScope",
    tagline: "AI 기반 PDF 발견",
    
    // Navigation
    features: "기능",
    about: "소개",
    help: "도움말",
    language: "언어",
    
    // Search interface
    searchPlaceholder: "전 세계 수백만 개의 PDF 검색...",
    searchButton: "검색",
    searching: "검색 중",
    
    // Filters
    filterByYear: "연도별 필터",
    yearRange2020: "2020-2025",
    yearRange2015: "2015-2025",
    yearRange2000: "2000-2025",
    yearRange1975: "1975-2025",
    
    // Results
    results: "결과",
    foundIn: "에서 발견",
    seconds: "초",
    noResults: "PDF를 찾을 수 없습니다",
    tryDifferent: "다른 키워드를 시도하거나 필터를 조정하세요",
    
    // Actions
    readPdf: "PDF 읽기",
    download: "다운로드",
    viewSource: "소스 보기",
    close: "닫기",
    
    // Content
    aiSummary: "AI 요약",
    relatedSearches: "관련 검색",
    publicationDate: "발행일",
    domain: "도메인",
    fileSize: "파일 크기",
    
    // Welcome section
    welcomeTitle: "5천만 이상의 PDF 검색",
    welcomeSubtitle: "AI 기반 검색 엔진으로 1975-2025년의 연구 논문, 학술 출판물 및 문서를 발견하세요. 세계 지식에 즉시 액세스하세요.",
    
    // Features
    googlePoweredTitle: "Google 기반 검색",
    googlePoweredDesc: "고급 필터링으로 Google의 포괄적인 인덱스를 통해 수백만 개의 PDF에 액세스하세요.",
    yearsKnowledgeTitle: "50년의 지식",
    yearsKnowledgeDesc: "1975년부터 2025년까지의 문서를 탐색하고, 최신 출판물이 먼저 우선됩니다.",
    aiEnhancedTitle: "AI 향상된 발견",
    aiEnhancedDesc: "더 나은 연구 결과를 위한 스마트 쿼리 최적화 및 자동 요약.",
    
    // PDF Viewer
    pdfViewerNotAvailable: "직접 PDF 보기를 사용할 수 없습니다",
    pdfViewerMessage: "이 문서는 원본 소스에서 봐야 합니다.",
    viewOnSource: "에서 보기",
    
    // Error messages
    searchFailed: "검색 실패. 다시 시도해 주세요.",
    loadingError: "콘텐츠 로드 실패",
    
    // Stats
    millionsLabel: "백만",
    pdfDocuments: "PDF 문서",
    recentFocus: "최근 초점",
    aiPoweredLabel: "AI 기반",
    smartSearch: "스마트 검색"
  }
  // Add other languages with complete translations...
};

// Main App Component
function App() {
  // Initialize currentLang from localStorage or default to 'en'
  const [currentLang, setCurrentLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('pdfscope_language');
      return (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) ? savedLanguage : 'en';
    }
    return 'en';
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [yearRange, setYearRange] = useState({ start: 2015, end: 2025 });
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Get current translations
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Language persistence and RTL support - simplified to one useEffect
  useEffect(() => {
    // Save language to localStorage whenever language changes
    localStorage.setItem('pdfscope_language', currentLang);
    
    // Handle RTL for Arabic
    const isRTL = currentLang === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    // Add RTL class to body for additional styling if needed
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [currentLang]); // This runs whenever currentLang changes

  // Language change handler
  const handleLanguageChange = (langCode) => {
    setCurrentLang(langCode);
    setShowLanguageMenu(false);
  };

  // Dark mode toggle handler
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Search function with increased results
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchPayload = {
        query: query.trim(),
        max_results: 50, // Increased to 50 as requested
        date_range: `${yearRange.start}-${yearRange.end}`,
        priority_google: true
      };
      
      const response = await axios.post(`${API}/search`, searchPayload);
      
      // Sort results by publication date (most recent first)
      const sortedResults = response.data.results?.sort((a, b) => {
        const yearA = parseInt(a.publication_date) || 0;
        const yearB = parseInt(b.publication_date) || 0;
        return yearB - yearA;
      }) || [];
      
      setSearchResults({
        ...response.data,
        results: sortedResults
      });
      
      // Fetch suggestions
      const suggestionsResponse = await axios.get(`${API}/suggestions?q=${encodeURIComponent(query)}`);
      setSuggestions(suggestionsResponse.data.suggestions || []);
      
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults({ error: t.searchFailed });
    }
    setLoading(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fixed PDF Viewer Component
  const PDFViewer = ({ pdf, onClose }) => {
    const [pdfError, setPdfError] = useState(false);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-800 truncate">
                {pdf.title}
              </h3>
              <div className="flex items-center space-x-3 mt-2 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                  {pdf.source}
                </span>
                {pdf.domain && <span className="text-gray-500">🌐 {pdf.domain}</span>}
                {pdf.publication_date && <span className="text-gray-500">📅 {pdf.publication_date}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 text-3xl font-light"
              aria-label={t.close}
            >
              ×
            </button>
          </div>
          <div className="flex-1 p-6">
            {pdf.download_url && !pdfError ? (
              <iframe
                src={`${pdf.download_url}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full rounded-lg border border-gray-200"
                title={pdf.title}
                onError={() => setPdfError(true)}
                onLoad={(e) => {
                  // Check if iframe loaded successfully
                  try {
                    if (e.target.contentDocument === null) {
                      setPdfError(true);
                    }
                  } catch (err) {
                    // Cross-origin error, try alternative approach
                    setTimeout(() => {
                      if (e.target.contentWindow.location.href === 'about:blank') {
                        setPdfError(true);
                      }
                    }, 3000);
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h4 className="text-lg font-bold text-gray-800 mb-2">
                    {t.pdfViewerNotAvailable}
                  </h4>
                  <p className="text-gray-600 mb-6">
                    {t.pdfViewerMessage}
                  </p>
                  <div className="space-y-3">
                    <a
                      href={pdf.download_url || pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors mr-3"
                    >
                      {t.download}
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </a>
                    <a
                      href={pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                    >
                      {t.viewOnSource} {pdf.source}
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Year Range Filter Component
  const YearRangeFilter = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {t.filterByYear}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { start: 2020, end: 2025, label: t.yearRange2020 },
          { start: 2015, end: 2025, label: t.yearRange2015 },
          { start: 2000, end: 2025, label: t.yearRange2000 },
          { start: 1975, end: 2025, label: t.yearRange1975 }
        ].map((range) => (
          <button
            key={range.label}
            onClick={() => setYearRange({ start: range.start, end: range.end })}
            className={`p-3 rounded-lg border-2 transition-all text-left font-semibold ${
              yearRange.start === range.start && yearRange.end === range.end
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="font-bold">{range.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Enhanced Search Result Card Component
  const SearchResultCard = ({ result, index }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {result.thumbnail_url ? (
            <img
              src={result.thumbnail_url}
              alt={result.title}
              className="w-16 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              onError={(e) => {e.target.style.display = 'none'}}
            />
          ) : (
            <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-bold text-gray-800 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
              {result.title}
            </h3>
            
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {result.publication_date && (
                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm font-bold rounded-full border border-blue-200">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {result.publication_date}
                </span>
              )}
              
              {result.domain && (
                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-sm font-bold rounded-full border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {result.domain}
                </span>
              )}
              
              {result.file_size && (
                <span className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-700 text-sm font-semibold rounded-full border border-gray-200">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {result.file_size}
                </span>
              )}
            </div>

            {/* Categories */}
            {result.categories && result.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {result.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-200 font-semibold"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            {/* AI Summary */}
            {result.ai_summary && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-4 border border-blue-100">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-blue-700 mb-1">{t.aiSummary}</p>
                    <p className="text-sm text-blue-600 line-clamp-3">{result.ai_summary}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Description */}
            {result.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {result.description}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {result.download_url && (
                <button
                  onClick={() => setSelectedPdf(result)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t.readPdf}
                </button>
              )}
              {result.download_url && (
                <a
                  href={result.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.download}
                </a>
              )}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {t.viewSource}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} ${currentLang === 'ar' ? 'rtl' : 'ltr'}`} dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header - Fully translated */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-800">
                    {t.siteTitle}
                  </h1>
                  <p className="text-sm text-gray-600 font-semibold">
                    {t.tagline}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">{SUPPORTED_LANGUAGES[currentLang]}</span>
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => handleLanguageChange(code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          currentLang === code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                        } ${code === Object.keys(SUPPORTED_LANGUAGES)[0] ? 'rounded-t-lg' : ''} ${
                          code === Object.keys(SUPPORTED_LANGUAGES)[Object.keys(SUPPORTED_LANGUAGES).length - 1] ? 'rounded-b-lg' : ''
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="hidden md:flex space-x-6 text-sm">
                <a href="#" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">{t.features}</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">{t.about}</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-bold transition-colors">{t.help}</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Search Section */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Interface - Always visible at top */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-12 pr-4 py-4 text-lg text-gray-800 placeholder-gray-500 bg-transparent focus:outline-none font-semibold"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-blue-400 disabled:to-green-400 text-white font-black rounded-xl transition-all flex items-center space-x-2 min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{t.searching}...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{t.searchButton}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Year Range Filter */}
        <YearRangeFilter />

        {/* Search Results - Displayed immediately below search */}
        {searchResults && (
          <div className="mb-8">
            {searchResults.error ? (
              <div className="text-center py-16">
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl inline-block">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold">{searchResults.error}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Search Stats */}
                <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-gray-800 mb-2">
                        {searchResults.total_found} {t.results} {t.foundIn} {searchResults.search_time} {t.seconds}
                      </h3>
                      <p className="text-gray-600 font-semibold">
                        "{searchResults.query}" • {yearRange.start}-{yearRange.end}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                {searchResults.results && searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {searchResults.results.map((result, index) => (
                      <SearchResultCard key={result.id || index} result={result} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-8xl mb-6">📭</div>
                    <h3 className="text-2xl font-black text-gray-800 mb-4">
                      {t.noResults}
                    </h3>
                    <p className="text-gray-600 mb-8 font-semibold">
                      {t.tryDifferent}
                    </p>
                  </div>
                )}

                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {t.relatedSearches}
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-bold"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Welcome Section - Only shown when no search results */}
        {!searchResults && (
          <section className="py-16 text-center">
            <div className="mb-16">
              <h2 className="text-5xl font-black text-gray-800 mb-6">
                {t.welcomeTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto font-semibold">
                {t.welcomeSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-black text-gray-800 mb-3">{t.googlePoweredTitle}</h4>
                <p className="text-gray-600 font-semibold">
                  {t.googlePoweredDesc}
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-black text-gray-800 mb-3">{t.yearsKnowledgeTitle}</h4>
                <p className="text-gray-600 font-semibold">
                  {t.yearsKnowledgeDesc}
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-xl font-black text-gray-800 mb-3">{t.aiEnhancedTitle}</h4>
                <p className="text-gray-600 font-semibold">
                  {t.aiEnhancedDesc}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <PDFViewer 
          pdf={selectedPdf} 
          onClose={() => setSelectedPdf(null)} 
        />
      )}
    </div>
  );
}

export default App;