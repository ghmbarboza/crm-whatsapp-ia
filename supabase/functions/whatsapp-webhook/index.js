"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jsr:@supabase/functions-js/edge-runtime.d.ts");
var supabase_js_2_1 = require("jsr:@supabase/supabase-js@2");
var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function extractPhone(remoteJid) {
    if (!remoteJid)
        return "";
    return remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
}
function extractMessage(payload) {
    var _a, _b;
    var msg = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.message;
    return (msg === null || msg === void 0 ? void 0 : msg.conversation) || ((_b = msg === null || msg === void 0 ? void 0 : msg.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.text) || "";
}
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabase, payload, phone, content, pushName, formattedPhone, lead, _a, newLead, error, _b, mensagem, msgError, aiUrl, error_1;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                if (req.method === "OPTIONS") {
                    return [2 /*return*/, new Response("ok", { headers: corsHeaders })];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 7, , 8]);
                supabase = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
                return [4 /*yield*/, req.json()];
            case 2:
                payload = _f.sent();
                phone = extractPhone((_d = (_c = payload.data) === null || _c === void 0 ? void 0 : _c.key) === null || _d === void 0 ? void 0 : _d.remoteJid);
                content = extractMessage(payload);
                pushName = ((_e = payload.data) === null || _e === void 0 ? void 0 : _e.pushName) || "Lead WhatsApp";
                if (!phone || !content) {
                    return [2 /*return*/, new Response(JSON.stringify({ ok: true, skipped: true }), {
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                formattedPhone = phone.length === 11
                    ? "(".concat(phone.slice(0, 2), ") ").concat(phone.slice(2, 7), "-").concat(phone.slice(7))
                    : phone;
                return [4 /*yield*/, supabase
                        .from("leads")
                        .select("*")
                        .eq("telefone", formattedPhone)
                        .is("deleted_at", null)
                        .maybeSingle()];
            case 3:
                lead = (_f.sent()).data;
                if (!!lead) return [3 /*break*/, 5];
                return [4 /*yield*/, supabase
                        .from("leads")
                        .insert({
                        nome: pushName,
                        telefone: formattedPhone,
                        origem: "WhatsApp",
                        etapa_pipeline: "Novo",
                        classificacao: "frio",
                        sentimento: "neutro",
                    })
                        .select()
                        .single()];
            case 4:
                _a = _f.sent(), newLead = _a.data, error = _a.error;
                if (error)
                    throw error;
                lead = newLead;
                _f.label = 5;
            case 5: return [4 /*yield*/, supabase
                    .from("mensagens_whatsapp")
                    .insert({
                    lead_id: lead.id,
                    conteudo: content,
                    tipo: "recebida",
                    analisado: false,
                })
                    .select()
                    .single()];
            case 6:
                _b = _f.sent(), mensagem = _b.data, msgError = _b.error;
                if (msgError)
                    throw msgError;
                aiUrl = "".concat(Deno.env.get("SUPABASE_URL"), "/functions/v1/ai-classify");
                fetch(aiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer ".concat(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
                    },
                    body: JSON.stringify({
                        lead_id: lead.id,
                        mensagem_id: mensagem.id,
                        conteudo: content,
                    }),
                }).catch(console.error);
                return [2 /*return*/, new Response(JSON.stringify({ ok: true, lead_id: lead.id }), {
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 7:
                error_1 = _f.sent();
                console.error(error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: String(error_1) }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 8: return [2 /*return*/];
        }
    });
}); });
