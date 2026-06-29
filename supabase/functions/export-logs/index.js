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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
require("jsr:@supabase/functions-js/edge-runtime.d.ts");
var supabase_js_2_1 = require("jsr:@supabase/supabase-js@2");
var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, supabase, profile, _a, _b, _c, _d, inicio, fim, entidade, serviceClient, query, _e, data, error, headers_1, csv, error_1;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                if (req.method === "OPTIONS") {
                    return [2 /*return*/, new Response("ok", { headers: corsHeaders })];
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 6, , 7]);
                authHeader = req.headers.get("Authorization");
                if (!authHeader) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: "Não autorizado" }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                supabase = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authHeader } } });
                _b = (_a = supabase
                    .from("profiles")
                    .select("role"))
                    .eq;
                _c = ["id"];
                return [4 /*yield*/, supabase.auth.getUser()];
            case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_f = (_g.sent()).data.user) === null || _f === void 0 ? void 0 : _f.id]))
                    .single()];
            case 3:
                profile = (_g.sent()).data;
                if ((profile === null || profile === void 0 ? void 0 : profile.role) !== "admin") {
                    return [2 /*return*/, new Response(JSON.stringify({ error: "Acesso negado" }), {
                            status: 403,
                            headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                        })];
                }
                return [4 /*yield*/, req.json().catch(function () { return ({}); })];
            case 4:
                _d = _g.sent(), inicio = _d.inicio, fim = _d.fim, entidade = _d.entidade;
                serviceClient = (0, supabase_js_2_1.createClient)(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
                query = serviceClient
                    .from("audit_logs")
                    .select("*, profiles(full_name, email)")
                    .order("criado_em", { ascending: false })
                    .limit(10000);
                if (inicio)
                    query = query.gte("criado_em", inicio);
                if (fim)
                    query = query.lte("criado_em", fim);
                if (entidade)
                    query = query.eq("entidade", entidade);
                return [4 /*yield*/, query];
            case 5:
                _e = _g.sent(), data = _e.data, error = _e.error;
                if (error)
                    throw error;
                headers_1 = ["id", "user_id", "acao", "entidade", "entidade_id", "criado_em"];
                csv = __spreadArray([
                    headers_1.join(",")
                ], (data || []).map(function (row) {
                    return headers_1.map(function (h) { var _a; return JSON.stringify((_a = row[h]) !== null && _a !== void 0 ? _a : ""); }).join(",");
                }), true).join("\n");
                return [2 /*return*/, new Response(csv, {
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="audit_logs.csv"' }),
                    })];
            case 6:
                error_1 = _g.sent();
                console.error(error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: String(error_1) }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { "Content-Type": "application/json" }),
                    })];
            case 7: return [2 /*return*/];
        }
    });
}); });
