
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// =====================================
// حماية لوحة الإدارة وواجهات التعديل
// =====================================

function safeCompare(a, b) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    return (
        aBuffer.length === bBuffer.length &&
        crypto.timingSafeEqual(aBuffer, bBuffer)
    );
}

function adminAuth(req, res, next) {
    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    // لا تسمح بالدخول إذا لم يتم إعداد بيانات الحماية
    if (!expectedUsername || !expectedPassword) {
        console.error("Admin authentication variables are missing.");

        return res.status(503).send(
            "Admin authentication is not configured."
        );
    }

    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Basic ")) {
        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="Fashion Store Admin", charset="UTF-8"'
        );

        return res.status(401).send("Authentication required.");
    }

    let username;
    let password;

    try {
        const decoded = Buffer.from(
            authHeader.slice(6),
            "base64"
        ).toString("utf8");

        const separator = decoded.indexOf(":");

        if (separator < 0) {
            throw new Error("Invalid authorization header");
        }

        username = decoded.slice(0, separator);
        password = decoded.slice(separator + 1);
    } catch {
        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="Fashion Store Admin", charset="UTF-8"'
        );

        return res.status(401).send("Invalid credentials.");
    }

    const validUsername = safeCompare(
        username,
        expectedUsername
    );

    const validPassword = safeCompare(
        password,
        expectedPassword
    );

    if (!validUsername || !validPassword) {
        res.setHeader(
            "WWW-Authenticate",
            'Basic realm="Fashion Store Admin", charset="UTF-8"'
        );

        return res.status(401).send("Invalid credentials.");
    }

    next();
}

// =====================================
// حماية المسارات قبل الملفات الثابتة
// مهم: هذا الجزء يجب أن يسبق express.static
// =====================================

app.use((req, res, next) => {
    const method = req.method;
    const urlPath = req.path;

    const protectedRoute =
        urlPath === "/admin.html" ||
        (urlPath === "/api/orders" && method === "GET") ||
        (urlPath === "/api/products" && method === "POST") ||
        (
            /^\/api\/products\/\d+$/.test(urlPath) &&
            ["PUT", "DELETE"].includes(method)
        ) ||
        (
            /^\/api\/site-settings\/[^/]+$/.test(urlPath) &&
            method === "PUT"
        );

    if (protectedRoute) {
        return adminAuth(req, res, next);
    }

    next();
});

// الملفات الثابتة بعد تطبيق الحماية
app.use(express.static(__dirname));

// =====================================
// صفحات الموقع
// =====================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});

// =====================================
// جلب المنتجات - عام للعملاء
// =====================================

app.get("/api/products", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("GET PRODUCTS ERROR:", error);
            return res.status(500).json({
                message: "تعذر تحميل المنتجات"
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
// إضافة منتج - محمي
// =====================================

app.post("/api/products", async (req, res) => {
    try {
        const { name, price, image } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof image !== "string" ||
            !image.trim() ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {
            return res.status(400).json({
                message: "تحقق من اسم المنتج والسعر والصورة"
            });
        }

        const { data, error } = await supabase
            .from("products")
            .insert([{
                name: name.trim(),
                price: Number(price),
                image: image.trim()
            }])
            .select()
            .single();

        if (error) {
            console.error("ADD PRODUCT ERROR:", error);
            return res.status(500).json({
                message: "تعذر إضافة المنتج"
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
// تعديل منتج - محمي
// =====================================

app.put("/api/products/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, price, image } = req.body;

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "رقم المنتج غير صحيح"
            });
        }

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof image !== "string" ||
            !image.trim() ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {
            return res.status(400).json({
                message: "تحقق من اسم المنتج والسعر والصورة"
            });
        }

        const { data, error } = await supabase
            .from("products")
            .update({
                name: name.trim(),
                price: Number(price),
                image: image.trim()
            })
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("UPDATE PRODUCT ERROR:", error);
            return res.status(500).json({
                message: "تعذر تعديل المنتج"
            });
        }

        if (!data) {
            return res.status(404).json({
                message: "المنتج غير موجود"
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
// حذف منتج - محمي
// =====================================

app.delete("/api/products/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "رقم المنتج غير صحيح"
            });
        }

        const { data, error } = await supabase
            .from("products")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) {
            console.error("DELETE PRODUCT ERROR:", error);
            return res.status(500).json({
                message: "تعذر حذف المنتج"
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                message: "المنتج غير موجود"
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
// جلب صور الأقسام - عام للعملاء
// =====================================

app.get("/api/site-settings", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("site_settings")
            .select("setting_key, setting_value");

        if (error) {
            console.error("GET SITE SETTINGS ERROR:", error);
            return res.status(500).json({
                message: "تعذر تحميل إعدادات الموقع"
            });
        }

        const settings = {
            men_image: "",
            women_image: "",
            kids_image: ""
        };

        (data || []).forEach((item) => {
            if (Object.hasOwn(settings, item.setting_key)) {
                settings[item.setting_key] =
                    item.setting_value || "";
            }
        });

        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "حدث خطأ في تحميل إعدادات الموقع"
        });
    }
});

// =====================================
// تحديث صور الأقسام - محمي
// =====================================

app.put("/api/site-settings/:key", async (req, res) => {
    try {
        const allowedKeys = [
            "men_image",
            "women_image",
            "kids_image"
        ];

        const key = req.params.key;
        const value = req.body.value;

        if (!allowedKeys.includes(key)) {
            return res.status(400).json({
                message: "إعداد غير مسموح"
            });
        }

        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            return res.status(400).json({
                message: "رابط الصورة مطلوب"
            });
        }

        const { data, error } = await supabase
            .from("site_settings")
            .update({
                setting_value: value.trim(),
                updated_at: new Date().toISOString()
            })
            .eq("setting_key", key)
            .select()
            .maybeSingle();

        if (error) {
            console.error("UPDATE SITE SETTING ERROR:", error);
            return res.status(500).json({
                message: "تعذر تحديث صورة القسم"
            });
        }

        if (!data) {
            return res.status(404).json({
                message: "إعداد القسم غير موجود في قاعدة البيانات"
            });
        }

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "حدث خطأ أثناء تحديث صورة القسم"
        });
    }
});

// =====================================
// جلب الطلبات - محمي
// =====================================

app.get("/api/orders", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("GET ORDERS ERROR:", error);
            return res.status(500).json({
                message: "تعذر تحميل الطلبات"
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
// إنشاء طلب من العميل - عام
// =====================================

app.post("/api/orders", async (req, res) => {
    try {
        const { name, phone, address, items, total } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof phone !== "string" ||
            !phone.trim() ||
            typeof address !== "string" ||
            !address.trim() ||
            !Array.isArray(items) ||
            items.length === 0 ||
            items.length > 100
        ) {
            return res.status(400).json({
                message: "بيانات الطلب غير مكتملة أو غير صحيحة"
            });
        }

        // تنبيه: الإجمالي هنا ما زال قادمًا من المتصفح.
        // يجب لاحقًا حساب الإجمالي داخل السيرفر اعتمادًا
        // على الأسعار الموثوقة في قاعدة البيانات.

        const orderTotal = Number(total);

        if (!Number.isFinite(orderTotal) || orderTotal < 0) {
            return res.status(400).json({
                message: "إجمالي الطلب غير صحيح"
            });
        }

        const { data, error } = await supabase
            .from("orders")
            .insert([{
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim(),
                items,
                total: orderTotal,
                date: new Date().toLocaleString("ar-EG")
            }])
            .select()
            .single();

        if (error) {
            console.error("ADD ORDER ERROR:", error);
            return res.status(500).json({
                message: "تعذر حفظ الطلب"
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

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
