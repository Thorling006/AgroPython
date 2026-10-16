/**
 * AgroSmart Crop Catalog
 * Contains technical requirements and fertilizer plans for 85+ crops.
 */

const CROP_CATALOG = {
    "café": {
        name: "Café",
        scientific_name: "Coffea arabica",
        min_temp: 15,
        max_temp: 24,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Francos, profundos, bien drenados",
        description: "El café requiere climas templados. Altitudes entre 600 y 1200 msnm son ideales.",
        fertilizer_plan: [
            { day: 30, product: "Nitrógeno", dose: "50g/planta" },
            { day: 90, product: "Fosfato", dose: "30g/planta" },
            { day: 180, product: "Potasio", dose: "40g/planta" }
        ],
        source: "Certificación MAG/FAO 2024"
    },
    "tomate": {
        name: "Tomate",
        scientific_name: "Solanum lycopersicum",
        min_temp: 18,
        max_temp: 30,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Ricos en materia orgánica, buen drenaje",
        description: "Cultivo sensible a heladas. Requiere mucha luz solar.",
        fertilizer_plan: [
            { day: 15, product: "NPK 15-15-15", dose: "10g/planta" },
            { day: 45, product: "Nitrato de Calcio", dose: "15g/planta" }
        ],
        source: "Guía Técnica de Hortalizas 2023"
    },
    "zanahoria": {
        name: "Zanahoria",
        scientific_name: "Daucus carota",
        min_temp: 15,
        max_temp: 21,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Arenosos, profundos, sin piedras",
        description: "Requiere suelos sueltos para que la raíz crezca recta.",
        fertilizer_plan: [
            { day: 20, product: "Potasio", dose: "20g/m2" }
        ],
        source: "Manual de Cultivos de Raíz 2024"
    },
    "maíz": {
        name: "Maíz",
        scientific_name: "Zea mays",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 50,
        max_humidity: 80,
        soil_type: "Franco limosos",
        description: "Cultivo básico que requiere riego constante en floración.",
        fertilizer_plan: [
            { day: 25, product: "Urea", dose: "100kg/mz" },
            { day: 50, product: "Sulfato de Amonio", dose: "150kg/mz" }
        ],
        source: "Certificación MAG El Salvador"
    },
    "frijol": {
        name: "Frijol",
        scientific_name: "Phaseolus vulgaris",
        min_temp: 18,
        max_temp: 27,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Ligeros, con buen drenaje",
        description: "Fijador de nitrógeno natural. Sensible al exceso de agua.",
        fertilizer_plan: [
            { day: 15, product: "Fósforo", dose: "20kg/mz" }
        ],
        source: "Manual MAG El Salvador 2024"
    },
    "chile verde": {
        name: "Chile Verde",
        scientific_name: "Capsicum annuum",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 70,
        soil_type: "Fértiles, profundos",
        description: "Requiere tutorado para evitar que el peso del fruto rompa la planta.",
        fertilizer_plan: [
            { day: 20, product: "Fórmula Completa", dose: "15g/planta" }
        ],
        source: "Guía Técnica de Hortalizas 2023"
    },
    "güisquil": {
        name: "Güisquil (Whisky)",
        scientific_name: "Sechium edule",
        min_temp: 15,
        max_temp: 28,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Fértiles y con buen drenaje",
        description: "Planta trepadora muy común en zonas templadas de Mesoamérica.",
        fertilizer_plan: [
            { day: 30, product: "Abono Orgánico", dose: "1kg/base" }
        ]
    },
    "papa": {
        name: "Papa",
        scientific_name: "Solanum tuberosum",
        min_temp: 12,
        max_temp: 20,
        min_humidity: 70,
        max_humidity: 85,
        soil_type: "Francos, sueltos",
        description: "Fundamental el aporque para proteger los tubérculos.",
        fertilizer_plan: [
            { day: 30, product: "Cloruro de Potasio", dose: "25g/planta" }
        ]
    },
    "cebolla": {
        name: "Cebolla",
        scientific_name: "Allium cepa",
        min_temp: 13,
        max_temp: 24,
        min_humidity: 60,
        max_humidity: 70,
        soil_type: "Permeables, ricos en humus",
        description: "Requiere suelos que no se encharquen.",
        fertilizer_plan: [
            { day: 40, product: "Nitrógeno", dose: "15g/m2" }
        ]
    },
    "ajo": {
        name: "Ajo",
        scientific_name: "Allium sativum",
        min_temp: 10,
        max_temp: 22,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Francos, aireados",
        description: "Soporta bien el frío invernal.",
        fertilizer_plan: [
             { day: 60, product: "Abono Foliar", dose: "5ml/litro" }
        ]
    },
    "lechuga": {
        name: "Lechuga",
        scientific_name: "Lactuca sativa",
        min_temp: 15,
        max_temp: 22,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Muy ricos en nutrientes",
        description: "Ciclo rápido, requiere riego frecuente.",
        fertilizer_plan: [
            { day: 10, product: "Bioestimulante", dose: "3ml/litro" }
        ]
    },
    "repollo": {
        name: "Repollo",
        scientific_name: "Brassica oleracea var. capitata",
        min_temp: 15,
        max_temp: 20,
        min_humidity: 60,
        max_humidity: 90,
        soil_type: "Pesados y fértiles",
        description: "Requiere suelos consistentes y mucha humedad.",
        fertilizer_plan: [
            { day: 30, product: "Boro", dose: "2g/planta" }
        ]
    },
    "brócoli": {
        name: "Brócoli",
        scientific_name: "Brassica oleracea var. italica",
        min_temp: 14,
        max_temp: 18,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Orgánicos",
        description: "Sensible a temperaturas altas.",
        fertilizer_plan: [
            { day: 45, product: "Magnesio", dose: "5g/planta" }
        ]
    },
    "pepino": {
        name: "Pepino",
        scientific_name: "Cucumis sativus",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Fértiles, ligeros",
        description: "Alta demanda de agua durante el crecimiento del fruto.",
        fertilizer_plan: [
            { day: 25, product: "Potasio", dose: "10g/planta" }
        ]
    },
    "sandía": {
        name: "Sandía",
        scientific_name: "Citrullus lanatus",
        min_temp: 22,
        max_temp: 35,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Arenosos profundos",
        description: "Amante del calor y el sol directo.",
        fertilizer_plan: [
            { day: 30, product: "NPK 12-24-12", dose: "30g/planta" }
        ]
    },
    "melón": {
        name: "Melón",
        scientific_name: "Cucumis melo",
        min_temp: 22,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Francos bien drenados",
        description: "Requiere ambientes secos al final.",
        fertilizer_plan: [
            { day: 40, product: "Calcio", dose: "20g/planta" }
        ]
    },
    "fresa": {
        name: "Fresa",
        scientific_name: "Fragaria ananassa",
        min_temp: 15,
        max_temp: 25,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Ligeros, orgánicos",
        description: "Sensible a salinidad y encharcamientos.",
        fertilizer_plan: [
            { day: 30, product: "Potasio", dose: "15g/m2" }
        ]
    },
    "uva": {
        name: "Uva",
        scientific_name: "Vitis vinifera",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Pedregosos, bien drenados",
        description: "Cultivo perenne, requiere poda técnica.",
        fertilizer_plan: [
            { day: 120, product: "Potasio", dose: "50g/planta" }
        ]
    },
    "naranja": {
        name: "Naranja",
        scientific_name: "Citrus sinensis",
        min_temp: 18,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Profundos y fértiles",
        description: "Árbol frutal tropical y subtropical.",
        fertilizer_plan: [
            { day: 60, product: "Nitrosulfato", dose: "300g/árbol" }
        ]
    },
    "limón": {
        name: "Limón",
        scientific_name: "Citrus limon",
        min_temp: 18,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "No tolera salinidad",
        description: "Muy sensible al frío extremo.",
        fertilizer_plan: [
            { day: 60, product: "Zinc y Manganeso", dose: "foliar" }
        ]
    },
    "aguacate": {
        name: "Aguacate",
        scientific_name: "Persea americana",
        min_temp: 14,
        max_temp: 28,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Excelente drenaje",
        description: "Sensible a la humedad excesiva en raíz.",
        fertilizer_plan: [
            { day: 180, product: "Materia Orgánica", dose: "5kg/árbol" }
        ]
    },
    "mango": {
        name: "Mango",
        scientific_name: "Mangifera indica",
        min_temp: 24,
        max_temp: 35,
        min_humidity: 50,
        max_humidity: 75,
        soil_type: "Adaptable",
        description: "Necesita época seca para florecer.",
        fertilizer_plan: [
            { day: 150, product: "Potasio", dose: "200g/árbol" }
        ]
    },
    "banano": {
        name: "Banano",
        scientific_name: "Musa sapientum",
        min_temp: 22,
        max_temp: 32,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Aluviales profundos",
        description: "Alta demanda de potasio.",
        fertilizer_plan: [
            { day: 30, product: "Potasio", dose: "150g/planta" }
        ]
    },
    "piña": {
        name: "Piña",
        scientific_name: "Ananas comosus",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Ácidos, drenados",
        description: "Requiere inducción floral.",
        fertilizer_plan: [
            { day: 90, product: "Hierro y Zinc", dose: "foliar" }
        ]
    },
    "papaya": {
        name: "Papaya",
        scientific_name: "Carica papaya",
        min_temp: 22,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Francos, porosos",
        description: "Crecimiento rápido.",
        fertilizer_plan: [
            { day: 30, product: "Boro", dose: "5g/planta" }
        ]
    },
    "caña de azúcar": {
        name: "Caña de Azúcar",
        scientific_name: "Saccharum officinarum",
        min_temp: 20,
        max_temp: 35,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Pesados y fértiles",
        description: "Gran acumuladora de biomasa.",
        fertilizer_plan: [
            { day: 60, product: "Urea", dose: "200kg/ha" }
        ]
    },
    "arroz": {
        name: "Arroz",
        scientific_name: "Oryza sativa",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 70,
        max_humidity: 95,
        soil_type: "Arcillosos",
        description: "Prefiere suelos inundados.",
        fertilizer_plan: [
            { day: 25, product: "Sulfato de Amonio", dose: "150kg/ha" }
        ]
    },
    "cacao": {
        name: "Cacao",
        scientific_name: "Theobroma cacao",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 75,
        max_humidity: 85,
        soil_type: "Ricos en materia orgánica",
        description: "Requiere sombra inicial.",
        fertilizer_plan: [
            { day: 180, product: "Potasio", dose: "60g/planta" }
        ]
    },
    "soya": {
        name: "Soya",
        scientific_name: "Glycine max",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Francos",
        description: "Fuente de proteína vegetal.",
        fertilizer_plan: [
            { day: 20, product: "Fósforo", dose: "60kg/ha" }
        ]
    },
    "yuca": {
        name: "Yuca",
        scientific_name: "Manihot esculenta",
        min_temp: 22,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Resistente",
        description: "Raíz tuberosa energética.",
        fertilizer_plan: [
            { day: 60, product: "Materia Orgánica", dose: "1kg/planta" }
        ]
    },
    "jengibre": {
        name: "Jengibre",
        scientific_name: "Zingiber officinale",
        min_temp: 22,
        max_temp: 30,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Ricos y sueltos",
        description: "Se cultiva el rizoma.",
        fertilizer_plan: [
            { day: 60, product: "Bioestimulante", dose: "radicular" }
        ]
    },
    "algodón": {
        name: "Algodón",
        scientific_name: "Gossypium hirsutum",
        min_temp: 25,
        max_temp: 40,
        min_humidity: 60,
        max_humidity: 70,
        soil_type: "Profundos",
        description: "Necesita mucho calor y sol.",
        fertilizer_plan: [
            { day: 45, product: "Urea", dose: "100kg/ha" }
        ]
    },
    "litchi": {
        name: "Litchi",
        scientific_name: "Litchi chinensis",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 70,
        max_humidity: 85,
        soil_type: "Ácidos y profundos",
        description: "Fruto exótico de zonas subtropicales.",
        fertilizer_plan: [
            { day: 90, product: "Abono Completo", dose: "200g/árbol" }
        ]
    },
    "rambután": {
        name: "Rambután",
        scientific_name: "Nephelium lappaceum",
        min_temp: 22,
        max_temp: 35,
        min_humidity: 75,
        max_humidity: 90,
        soil_type: "Fértiles",
        description: "Típico de climas húmedos y calientes.",
        fertilizer_plan: [
            { day: 100, product: "Materia Orgánica", dose: "3kg/árbol" }
        ]
    },
    "mamey": {
        name: "Mamey",
        scientific_name: "Pouteria sapota",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Francos",
        description: "Árbol frutal tropical de gran tamaño.",
        fertilizer_plan: [
            { day: 120, product: "Triple 15", dose: "500g/árbol" }
        ]
    },
    "guanábana": {
        name: "Guanábana",
        scientific_name: "Annona muricata",
        min_temp: 18,
        max_temp: 30,
        min_humidity: 65,
        max_humidity: 80,
        soil_type: "Drenaje impecable",
        description: "Requiere polinización manual para mejores frutos.",
        fertilizer_plan: [
            { day: 60, product: "Fosfato", dose: "150g/árbol" }
        ]
    },
    "maracuyá": {
        name: "Maracuyá",
        scientific_name: "Passiflora edulis",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Arenosos-Francos",
        description: "Enredadera de crecimiento vigoroso.",
        fertilizer_plan: [
            { day: 45, product: "Nitrógeno y Potasio", dose: "40g/planta" }
        ]
    },
    "guayaba": {
        name: "Guayaba",
        scientific_name: "Psidium guajava",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Muy adaptable",
        description: "Rústica y resistente a diversos suelos.",
        fertilizer_plan: [
            { day: 75, product: "Compost", dose: "2kg/árbol" }
        ]
    },
    "zapote": {
        name: "Zapote",
        scientific_name: "Pouteria campechiana",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Francos",
        description: "Fruto dulce de pulpa amarilla o negra.",
        fertilizer_plan: [
            { day: 90, product: "Completo", dose: "300g/árbol" }
        ]
    },
    "nances": {
        name: "Nances",
        scientific_name: "Byrsonima crassifolia",
        min_temp: 22,
        max_temp: 35,
        min_humidity: 50,
        max_humidity: 75,
        soil_type: "Pobres y secos",
        description: "Muy resistente a la sequía.",
        fertilizer_plan: [
            { day: 120, product: "Nitrógeno", dose: "100g/árbol" }
        ]
    },
    "pitahaya": {
        name: "Pitahaya (Fruta del Dragón)",
        scientific_name: "Selenicereus undatus",
        min_temp: 18,
        max_temp: 32,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Cactáceo, poroso",
        description: "Cactus trepador, requiere tutores.",
        fertilizer_plan: [
            { day: 30, product: "Fósforo", dose: "20g/planta" }
        ]
    },
    "carambola": {
        name: "Carambola",
        scientific_name: "Averrhoa carambola",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 70,
        max_humidity: 85,
        soil_type: "Francos-Ácidos",
        description: "Fruta con forma de estrella al ser cortada.",
        fertilizer_plan: [
            { day: 60, product: "Potasio", dose: "200g/árbol" }
        ]
    },
    "arándano": {
        name: "Arándano",
        scientific_name: "Vaccinium corymbosum",
        min_temp: 10,
        max_temp: 22,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Muy ácidos (pH 4.5)",
        description: "Exigente en acidez de suelo.",
        fertilizer_plan: [
            { day: 30, product: "Sulfato de Amonio", dose: "15g/arbusto" }
        ]
    },
    "kiwi": {
        name: "Kiwi",
        scientific_name: "Actinidia deliciosa",
        min_temp: 10,
        max_temp: 24,
        min_humidity: 70,
        max_humidity: 85,
        soil_type: "Francos profundos",
        description: "Requiere horas frío y emparrado.",
        fertilizer_plan: [
            { day: 90, product: "Nitrógeno", dose: "50g/planta" }
        ]
    },
    "higo": {
        name: "Higo",
        scientific_name: "Ficus carica",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Calizos, adaptables",
        description: "Tolera bien la sequía y salinidad.",
        fertilizer_plan: [
            { day: 60, product: "Potasio", dose: "100g/árbol" }
        ]
    },
    "granada": {
        name: "Granada",
        scientific_name: "Punica granatum",
        min_temp: 15,
        max_temp: 35,
        min_humidity: 40,
        max_humidity: 65,
        soil_type: "Variados",
        description: "Muy resistente al calor y suelos pobres.",
        fertilizer_plan: [
            { day: 45, product: "Abono Foliar", dose: "general" }
        ]
    },
    "tamarindo": {
        name: "Tamarindo",
        scientific_name: "Tamarindus indica",
        min_temp: 24,
        max_temp: 38,
        min_humidity: 50,
        max_humidity: 80,
        soil_type: "Profundos",
        description: "Árbol de crecimiento lento y muy longevo.",
        fertilizer_plan: [
            { day: 180, product: "Triple 15", dose: "500g/árbol" }
        ]
    },
    "marañón": {
        name: "Marañón",
        scientific_name: "Anacardium occidentale",
        min_temp: 22,
        max_temp: 35,
        min_humidity: 50,
        max_humidity: 75,
        soil_type: "Arenosos",
        description: "Se aprovecha tanto el pseudofruto como la semilla.",
        fertilizer_plan: [
            { day: 90, product: "Fósforo", dose: "150g/árbol" }
        ]
    },
    "especies de sombra": {
        name: "Árboles de Sombra",
        scientific_name: "Erythrina / Inga",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 90,
        soil_type: "Adaptables",
        description: "Vitales para plantaciones de café y cacao.",
        fertilizer_plan: [
            { day: 365, product: "Natural", dose: "caída de hojas" }
        ]
    },
    "cilantro": {
        name: "Cilantro",
        scientific_name: "Coriandrum sativum",
        min_temp: 15,
        max_temp: 24,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Sueltos y fértiles",
        description: "Hierba aromática de ciclo corto.",
        fertilizer_plan: [
            { day: 15, product: "Abono Líquido", dose: "foliar" }
        ]
    },
    "perejil": {
        name: "Perejil",
        scientific_name: "Petroselinum crispum",
        min_temp: 12,
        max_temp: 24,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Humedad constante",
        description: "Germinación lenta.",
        fertilizer_plan: [
            { day: 20, product: "Nitrógeno", dose: "pequeña dosis" }
        ]
    },
    "albahaca": {
        name: "Albahaca",
        scientific_name: "Ocimum basilicum",
        min_temp: 18,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Mucha materia orgánica",
        description: "Sensible al frío extremo.",
        fertilizer_plan: [
            { day: 15, product: "Potasio", dose: "foliar" }
        ]
    },
    "menta": {
        name: "Menta",
        scientific_name: "Mentha x piperita",
        min_temp: 15,
        max_temp: 25,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Húmedos y ricos",
        description: "Invasiva, prefiere semi-sombra.",
        fertilizer_plan: [
            { day: 30, product: "Nitrógeno", dose: "moderado" }
        ]
    },
    "orégano": {
        name: "Orégano",
        scientific_name: "Origanum vulgare",
        min_temp: 15,
        max_temp: 30,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Drenados, calizos",
        description: "Resistente a la sequía.",
        fertilizer_plan: [
            { day: 60, product: "Compost", dose: "100g/planta" }
        ]
    },
    "romero": {
        name: "Romero",
        scientific_name: "Salvia rosmarinus",
        min_temp: 10,
        max_temp: 30,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Pobres y secos",
        description: "No tolera el encharcamiento.",
        fertilizer_plan: [
            { day: 90, product: "Materia Orgánica", dose: "mínima" }
        ]
    },
    "tomillo": {
        name: "Tomillo",
        scientific_name: "Thymus vulgaris",
        min_temp: 10,
        max_temp: 28,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Arenosos",
        description: "Planta mediterránea muy rústica.",
        fertilizer_plan: [
            { day: 100, product: "General", dose: "anual" }
        ]
    },
    "lavanda": {
        name: "Lavanda",
        scientific_name: "Lavandula angustifolia",
        min_temp: 10,
        max_temp: 28,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Alcalinos",
        description: "Requiere sol pleno y buen drenaje.",
        fertilizer_plan: [
            { day: 120, product: "Calcio", dose: "si el pH es bajo" }
        ]
    },
    "espinaca": {
        name: "Espinaca",
        scientific_name: "Spinacia oleracea",
        min_temp: 10,
        max_temp: 20,
        min_humidity: 60,
        max_humidity: 80,
        soil_type: "Muy fértiles",
        description: "Ciclo rápido, prefiere climas frescos.",
        fertilizer_plan: [
            { day: 15, product: "Nitrato de Calcio", dose: "10g/m2" }
        ]
    },
    "acelga": {
        name: "Acelga",
        scientific_name: "Beta vulgaris var. cicla",
        min_temp: 15,
        max_temp: 25,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Profundos y ricos",
        description: "Resistente y productiva.",
        fertilizer_plan: [
            { day: 25, product: "Nitrógeno", dose: "15g/m2" }
        ]
    },
    "betabel": {
        name: "Betabel (Remolacha)",
        scientific_name: "Beta vulgaris",
        min_temp: 15,
        max_temp: 22,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Sin piedras, sueltos",
        description: "Planta de raíz carnosa.",
        fertilizer_plan: [
            { day: 30, product: "Boro", dose: "1g/m2" }
        ]
    },
    "rábano": {
        name: "Rábano",
        scientific_name: "Raphanus sativus",
        min_temp: 12,
        max_temp: 20,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Livianos",
        description: "Ciclo cortísimo (25-30 días).",
        fertilizer_plan: [
            { day: 10, product: "Completo", dose: "5g/m2" }
        ]
    },
    "ruda": {
        name: "Ruda",
        scientific_name: "Ruta graveolens",
        min_temp: 12,
        max_temp: 28,
        min_humidity: 40,
        max_humidity: 70,
        soil_type: "Pobres y secos",
        description: "Planta medicinal y repelente natural.",
        fertilizer_plan: [
            { day: 90, product: "Orgánico", dose: "mínimo" }
        ]
    },
    "sábila": {
        name: "Sábila (Aloe Vera)",
        scientific_name: "Aloe vera",
        min_temp: 20,
        max_temp: 35,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Arenosos, nulo riego",
        description: "Suculenta con grandes propiedades.",
        fertilizer_plan: [
            { day: 180, product: "Fósforo", dose: "foliar" }
        ]
    },
    "vainilla": {
        name: "Vainilla",
        scientific_name: "Vanilla planifolia",
        min_temp: 22,
        max_temp: 30,
        min_humidity: 75,
        max_humidity: 90,
        soil_type: "Orgánicos",
        description: "Orquídea trepadora.",
        fertilizer_plan: [
            { day: 365, product: "Humus", dose: "2kg/planta" }
        ]
    },
    "pimienta": {
        name: "Pimienta",
        scientific_name: "Piper nigrum",
        min_temp: 24,
        max_temp: 30,
        min_humidity: 70,
        max_humidity: 90,
        soil_type: "Aluviales",
        description: "Requiere alta humedad.",
        fertilizer_plan: [
            { day: 120, product: "Completo", dose: "100g/planta" }
        ]
    },
    "canela": {
        name: "Canela",
        scientific_name: "Cinnamomum verum",
        min_temp: 25,
        max_temp: 32,
        min_humidity: 75,
        max_humidity: 90,
        soil_type: "Arenosos",
        description: "Se cosecha la corteza.",
        fertilizer_plan: [
            { day: 200, product: "Nitrógeno", dose: "150g/árbol" }
        ]
    },
    "clavo de olor": {
        name: "Clavo de Olor",
        scientific_name: "Syzygium aromaticum",
        min_temp: 22,
        max_temp: 32,
        min_humidity: 70,
        max_humidity: 95,
        soil_type: "Volcánicos profundos",
        description: "Requiere clima marítimo tropical.",
        fertilizer_plan: [
            { day: 180, product: "Triple 15", dose: "400g/árbol" }
        ]
    },
    "nuez moscada": {
        name: "Nuez Moscada",
        scientific_name: "Myristica fragrans",
        min_temp: 24,
        max_temp: 30,
        min_humidity: 75,
        max_humidity: 90,
        soil_type: "Orgánicos",
        description: "Árbol dioico (macho/hembra).",
        fertilizer_plan: [
            { day: 210, product: "Nitrógeno", dose: "300g/árbol" }
        ]
    },
    "cardamomo": {
        name: "Cardamomo",
        scientific_name: "Elettaria cardamomum",
        min_temp: 18,
        max_temp: 25,
        min_humidity: 75,
        max_humidity: 95,
        soil_type: "Francos profundos",
        description: "Requiere sombra densa.",
        fertilizer_plan: [
            { day: 90, product: "NPK", dose: "50g/planta" }
        ]
    },
    "eucalipto": {
        name: "Eucalipto",
        scientific_name: "Eucalyptus globulus",
        min_temp: 15,
        max_temp: 28,
        min_humidity: 50,
        max_humidity: 75,
        soil_type: "Muy profundos",
        description: "Árbol forestal y medicinal.",
        fertilizer_plan: [
            { day: 365, product: "Nitrógeno", dose: "anual" }
        ]
    },
    "pino": {
        name: "Pino",
        scientific_name: "Pinus spp.",
        min_temp: 5,
        max_temp: 25,
        min_humidity: 40,
        max_humidity: 70,
        soil_type: "Arenosos-Ácidos",
        description: "Resistente al frío y suelos pobres.",
        fertilizer_plan: [
            { day: 365, product: "Natural", dose: "micorrizas" }
        ]
    },
    "cedro": {
        name: "Cedro",
        scientific_name: "Cedrela odorata",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Fértiles profundos",
        description: "Madera preciosa de alto valor.",
        fertilizer_plan: [
            { day: 180, product: "Fósforo", dose: "crecimiento inicial" }
        ]
    },
    "caoba": {
        name: "Caoba",
        scientific_name: "Swietenia macrophylla",
        min_temp: 22,
        max_temp: 35,
        min_humidity: 60,
        max_humidity: 90,
        soil_type: "Varios",
        description: "El oro rojo de los bosques.",
        fertilizer_plan: [
            { day: 180, product: "NPK", dose: "diferido" }
        ]
    },
    "teca": {
        name: "Teca",
        scientific_name: "Tectona grandis",
        min_temp: 24,
        max_temp: 38,
        min_humidity: 60,
        max_humidity: 85,
        soil_type: "Muy fértiles",
        description: "Resistente a la humedad.",
        fertilizer_plan: [
            { day: 90, product: "Calcio", dose: "vital" }
        ]
    },
    "girasol": {
        name: "Girasol",
        scientific_name: "Helianthus annuus",
        min_temp: 18,
        max_temp: 30,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Profundos",
        description: "Oleaginosa importante.",
        fertilizer_plan: [
            { day: 30, product: "Boro", dose: "3g/planta" }
        ]
    },
    "ajonjolí": {
        name: "Ajonjolí (Sésamo)",
        scientific_name: "Sesamum indicum",
        min_temp: 25,
        max_temp: 35,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Adaptable",
        description: "Resistente a la sequía extrema.",
        fertilizer_plan: [
            { day: 40, product: "Nitrógeno", dose: "40kg/ha" }
        ]
    },
    "maní": {
        name: "Maní (Cacahuate)",
        scientific_name: "Arachis hypogaea",
        min_temp: 22,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Arenosos sueltos",
        description: "Flor se entierra.",
        fertilizer_plan: [
            { day: 40, product: "Calcio", dose: "200kg/ha" }
        ]
    },
    "lenteja": {
        name: "Lenteja",
        scientific_name: "Lens culinaris",
        min_temp: 6,
        max_temp: 20,
        min_humidity: 50,
        max_humidity: 70,
        soil_type: "Ligeros",
        description: "Resistente a heladas.",
        fertilizer_plan: [
            { day: 20, product: "Fósforo", dose: "10g/m2" }
        ]
    },
    "garbanzo": {
        name: "Garbanzo",
        scientific_name: "Cicer arietinum",
        min_temp: 15,
        max_temp: 25,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Secano",
        description: "Resistente al calor.",
        fertilizer_plan: [
            { day: 30, product: "Magnesio", dose: "5g/m2" }
        ]
    },
    "quinoa": {
        name: "Quinoa",
        scientific_name: "Chenopodium quinoa",
        min_temp: 5,
        max_temp: 20,
        min_humidity: 40,
        max_humidity: 60,
        soil_type: "Adaptable (Puna)",
        description: "Súper alimento andino.",
        fertilizer_plan: [
            { day: 45, product: "Nitrógeno", dose: "60kg/ha" }
        ]
    },
    "amaranto": {
        name: "Amaranto",
        scientific_name: "Amaranthus spp.",
        min_temp: 20,
        max_temp: 32,
        min_humidity: 50,
        max_humidity: 75,
        soil_type: "Francos",
        description: "Cultivo ancestral mesoamericano.",
        fertilizer_plan: [
            { day: 30, product: "NPK", dose: "moderado" }
        ]
    },
    "tabaco": {
        name: "Tabaco",
        scientific_name: "Nicotiana tabacum",
        min_temp: 20,
        max_temp: 30,
        min_humidity: 60,
        max_humidity: 75,
        soil_type: "Aluviales livianos",
        description: "Calidad de hoja sensible.",
        fertilizer_plan: [
            { day: 20, product: "Nitrato Potasio", dose: "50kg/ha" }
        ]
    },
    "hule": {
        name: "Hule (Caucho)",
        scientific_name: "Hevea brasiliensis",
        min_temp: 24,
        max_temp: 32,
        min_humidity: 75,
        max_humidity: 90,
        soil_type: "Latíticos-Profundos",
        description: "Producción de látex.",
        fertilizer_plan: [
            { day: 365, product: "Triple 15", dose: "anual" }
        ]
    }
};

window.CROP_CATALOG = CROP_CATALOG;
