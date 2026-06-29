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
function callAI(conteudo) {
    return __awaiter(this, void 0, void 0, function () {
        var apiUrl, apiKey, model, lower_1, quente, negativo, response, data, parsed;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    apiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
                    apiKey = Deno.env.get("AI_API_KEY");
                    model = Deno.env.get("AI_MODEL") || "gpt-4o-mini";
                    if (!apiKey) {
                        lower_1 = conteudo.toLowerCase();
                        quente = ["comprar", "urgente", "interessado", "orçamento", "preço"].some(function (w) { return lower_1.includes(w); });
                        negativo = ["não", "cancelar", "reclamação", "ruim"].some(function (w) { return lower_1.includes(w); });
                        return [2 /*return*/, {
                                classificacao: quente ? "quente" : "morno",
                                sentimento: negativo ? "negativo" : quente ? "positivo" : "neutro",
                                sugestao_resposta: "Olá! Obrigado pelo contato. Como posso ajudá-lo hoje?",
                            }];
                    }
                    return [4 /*yield*/, fetch(apiUrl, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: "Bearer ".concat(apiKey),
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [
                                    {
                                        role: "system",
                                        content: "Voc\u00EA \u00E9 um assistente de CRM em pt-BR. Analise a mensagem e retorne JSON com:\n- classificacao: \"quente\", \"morno\" ou \"frio\"\n- sentimento: \"positivo\", \"neutro\" ou \"negativo\"\n- sugestao_resposta: uma sugest\u00E3o breve de resposta para o vendedor",
                                    },
                                    { role: "user", content: conteudo },
                                ],
                                response_format: { type: "json_object" },
                            }),
                        })];
                case 1:
                    response = _d.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _d.sent();
                    parsed = JSON.parse(((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "{}");
                    return [2 /*return*/, {
                            classificacao: parsed.classificacao || "morno",
                            sentimento: parsed.sentimento || "neutro",
                            sugestao_resposta: parsed.sugestao_resposta,
                        }];
            }
        });
    });
}
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabase, _a, lead_id, mensagem_id, conteudo, result, lead, followUpMsg, evolutionUrl, evolutionKey, instance, notifyPhone, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === "OPTIONS") {
                    return [2 /*return*/, new Response("ok", { headers: corsHeaders })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 11, , 12]);
                supabase = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
                return [4 /*yield*/, req.json()];
            case 2:
                _a = _b.sent(), lead_id = _a.lead_id, mensagem_id = _a.mensagem_id, conteudo = _a.conteudo;
                return [4 /*yield*/, callAI(conteudo)];
            case 3:
                result = _b.sent();
                return [4 /*yield*/, supabase
                        .from("mensagens_whatsapp")
                        .update({ sentimento: result.sentimento, analisado: true })
                        .eq("id", mensagem_id)];
            case 4:
                _b.sent();
                return [4 /*yield*/, supabase
                        .from("leads")
                        .update({
                        classificacao: result.classificacao,
                        sentimento: result.sentimento,
                    })
                        .eq("id", lead_id)];
            case 5:
                _b.sent();
                if (!(result.classificacao === "quente")) return [3 /*break*/, 10];
                return [4 /*yield*/, supabase
                        .from("leads")
                        .select("responsavel_id, nome")
                        .eq("id", lead_id)
                        .single()];
            case 6:
                lead = (_b.sent()).data;
                followUpMsg = "\uD83D\uDD25 Lead quente: ".concat((lead === null || lead === void 0 ? void 0 : lead.nome) || "Novo lead", " demonstrou alto interesse. Responda rapidamente!");
                return [4 /*yield*/, supabase.from("alertas").insert({
                        lead_id: lead_id,
                        user_id: lead === null || lead === void 0 ? void 0 : lead.responsavel_id,
                        tipo: "lead_quente",
                        mensagem: followUpMsg,
                        enviado: false,
                    })];
            case 7:
                _b.sent();
                evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
                evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
                instance = Deno.env.get("EVOLUTION_INSTANCE") || "crm-whatsapp";
                notifyPhone = Deno.env.get("EVOLUTION_NOTIFY_PHONE");
                if (!(evolutionUrl && evolutionKey && notifyPhone)) return [3 /*break*/, 10];
                return [4 /*yield*/, fetch("".concat(evolutionUrl, "/message/sendText/").concat(instance), {
                        method: "POST",
                        headers: { "Content-Type": "application/json", apikey: evolutionKey },
                        body: JSON.stringify({ number: notifyPhone.replace(/\D/g, ""), text: followUpMsg }),
                    })];
            case 8:
                _b.sent();
                return [4 /*yield*/, supabase
                        .from("alertas")
                        .update({ enviado: true, enviado_em: new Date().toISOString() })
                        .eq("lead_id", lead_id)
                        .eq("tipo", "lead_quente")
                        .is("enviado_em", null)];
            case 9:
                _b.sent();
                _b.label = 10;
            case 10: return [2 /*return*/, new Response(JSON.stringify(__assign({ ok: true }, result)), {
                    headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                })];
            case 11:
                error_1 = _b.sent();
                console.error(error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: String(error_1) }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 12: return [2 /*return*/];
        }
    });
}); });
