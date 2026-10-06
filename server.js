const express = require("express");
const cors = require("cors");
require("dotenv").config();

const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================
// ملفات الموقع
// =====================================

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});


// =====================================
// المنتجات
// =====================================

// جلب المنتجات
app.get("/api/products", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("GET PRODUCTS ERROR:", error);
            return res.status(500).json({
                message: error.message
            });
        }

        res.json(data || []);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ في السيرفر"
        });

    }

});


// =====================================
// إضافة منتج
// =====================================

app.post("/api/products", async (req, res) => {

    try {

        const { name, price, image } = req.body;

        if (!name || price === undefined || !image) {

            return res.status(400).json({
                message: "اسم المنتج والسعر والصورة مطلوبة"
            });

        }

        const { data, error } = await supabase
            .from("products")
            .insert([
                {
                    name: name,
                    price: Number(price),
                    image: image
                }
            ])
            .select()
            .single();

        if (error) {

            console.error("ADD PRODUCT ERROR:", error);

            return res.status(500).json({
                message: error.message
            });

        }

        res.status(201).json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ أثناء إضافة المنتج"
        });

    }

});


// =====================================
// تعديل منتج
// =====================================

app.put("/api/products/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        const { name, price, image } = req.body;

        if (!id) {

            return res.status(400).json({
                message: "رقم المنتج غير صحيح"
            });

        }

        if (!name || price === undefined || !image) {

            return res.status(400).json({
                message: "اسم المنتج والسعر والصورة مطلوبة"
            });

        }

        const { data, error } = await supabase
            .from("products")
            .update({
                name: name,
                price: Number(price),
                image: image
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {

            console.error("UPDATE PRODUCT ERROR:", error);

            return res.status(500).json({
                message: error.message
            });

        }

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ أثناء تعديل المنتج"
        });

    }

});


// =====================================
// حذف منتج
// =====================================

app.delete("/api/products/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!id) {

            return res.status(400).json({
                message: "رقم المنتج غير صحيح"
            });

        }

        const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", id);

        if (error) {

            console.error("DELETE PRODUCT ERROR:", error);

            return res.status(500).json({
                message: error.message
            });

        }

        res.json({
            message: "تم حذف المنتج بنجاح"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ أثناء حذف المنتج"
        });

    }

});


// =====================================
// الطلبات
// =====================================

// جلب الطلبات للـ Admin
app.get("/api/orders", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("id", { ascending: false });

        if (error) {

            console.error("GET ORDERS ERROR:", error);

            return res.status(500).json({
                message: error.message
            });

        }

        res.json(data || []);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ في تحميل الطلبات"
        });

    }

});


// =====================================
// إنشاء طلب من العميل
// =====================================

app.post("/api/orders", async (req, res) => {

    try {

        const {
            name,
            phone,
            address,
            items,
            total
        } = req.body;

        if (!name || !phone || !address || !items || items.length === 0) {

            return res.status(400).json({
                message: "بيانات الطلب غير مكتملة"
            });

        }

        const { data, error } = await supabase
            .from("orders")
            .insert([
                {
                    name: name,
                    phone: phone,
                    address: address,
                    items: items,
                    total: Number(total || 0),
                    date: new Date().toLocaleString("ar-EG")
                }
            ])
            .select()
            .single();

        if (error) {

            console.error("ADD ORDER ERROR:", error);

            return res.status(500).json({
                message: error.message
            });

        }

        res.status(201).json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "حدث خطأ أثناء إرسال الطلب"
        });

    }

});


// =====================================
// تشغيل السيرفر
// =====================================

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});