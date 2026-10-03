const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 5000;

// إعدادات السيرفر
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تشغيل ملفات الموقع
app.use(express.static(__dirname));

// منتجات الملابس
const products = [
    {
        id: 1,
        name: "تيشيرت رجالي",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.18.jpeg"
    },
    {
        id: 2,
        name: "تيشيرت رجالي 2",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.20(2) - Copy.jpeg"
    },
    {
        id: 3,
        name: "تيشيرت رجالي 3",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.20(2).jpeg"
    },
    {
        id: 4,
        name: "تيشيرت رجالي 4",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.20(1) - Copy.jpeg"
    },
    {
        id: 5,
        name: "تيشيرت رجالي 5",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.20(1).jpeg"
    },
    {
        id: 6,
        name: "تيشيرت رجالي 6",
        price: 450,
        image: "images for store/WhatsApp Image 2026-10-02 at 19.34.18(1).jpeg"
    }
];


// الصفحة الرئيسية
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// عرض المنتجات
app.get("/api/products", (req, res) => {
    res.json(products);
});

// تخزين الطلبات مؤقتًا
let orders = [];

// استقبال الطلبات
app.post("/api/orders", (req, res) => {
    const { name, phone, address, items, total } = req.body;

    if (!name || !phone || !address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "يرجى إدخال جميع بيانات الطلب"
        });
    }

    const newOrder = {
        id: Date.now(),
        name,
        phone,
        address,
        items,
        total,
        date: new Date().toLocaleString("ar-EG")
    };

    orders.push(newOrder);

    res.status(201).json({
        message: "تم استلام طلبك بنجاح",
        order: newOrder
    });
});

// عرض الطلبات
app.get("/api/orders", (req, res) => {
    res.json(orders);
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});