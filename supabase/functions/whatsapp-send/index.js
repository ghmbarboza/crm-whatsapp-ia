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
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, supabase, user, _a, lead_id, conteudo, anexo_url, lead, evolutionUrl, evolutionKey, instance, phone, serviceClient, _b, mensagem, error, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method === "OPTIONS") {
                    return [2 /*return*/, new Response("ok", { headers: corsHeaders })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 8, , 9]);
                authHeader = req.headers.get("Authorization");
                if (!authHeader) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: "Não autorizado" }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                supabase = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authHeader } } });
                return [4 /*yield*/, supabase.auth.getUser()];
            case 2:
                user = (_c.sent()).data.user;
                if (!user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: "Não autorizado" }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                return [4 /*yield*/, req.json()];
            case 3:
                _a = _c.sent(), lead_id = _a.lead_id, conteudo = _a.conteudo, anexo_url = _a.anexo_url;
                if (!lead_id || !conteudo) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: "lead_id e conteudo obrigatórios" }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                return [4 /*yield*/, supabase
                        .from("leads")
                        .select("telefone")
                        .eq("id", lead_id)
                        .single()];
            case 4:
                lead = (_c.sent()).data;
                if (!lead)
                    throw new Error("Lead não encontrado");
                evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
                evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
                instance = Deno.env.get("EVOLUTION_INSTANCE") || "crm-whatsapp";
                if (!(evolutionUrl && evolutionKey)) return [3 /*break*/, 6];
                phone = lead.telefone.replace(/\D/g, "");
                return [4 /*yield*/, fetch("".concat(evolutionUrl, "/message/sendText/").concat(instance), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            apikey: evolutionKey,
                        },
                        body: JSON.stringify({
                            number: phone,
                            text: conteudo,
                        }),
                    })];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                serviceClient = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
                return [4 /*yield*/, serviceClient
                        .from("mensagens_whatsapp")
                        .insert({
                        lead_id: lead_id,
                        enviado_por: user.id,
                        conteudo: conteudo,
                        anexo_url: anexo_url,
                        tipo: "enviada",
                        analisado: true,
                    })
                        .select()
                        .single()];
            case 7:
                _b = _c.sent(), mensagem = _b.data, error = _b.error;
                if (error)
                    throw error;
                return [2 /*return*/, new Response(JSON.stringify({ ok: true, mensagem: mensagem }), {
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 8:
                error_1 = _c.sent();
                console.error(error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: String(error_1) }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
