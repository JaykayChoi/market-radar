import React, { useState } from 'react'

// ── 임시 데이터 (UI 확인용) ─────────────────────────────────────

const MOCK_PCR_HISTORY = [
  { date: '2026-03-17', total: 0.82, equity: 0.65, index: 1.35 },
  { date: '2026-03-18', total: 0.91, equity: 0.72, index: 1.48 },
  { date: '2026-03-19', total: 1.05, equity: 0.85, index: 1.62 },
  { date: '2026-03-20', total: 0.78, equity: 0.61, index: 1.28 },
  { date: '2026-03-21', total: 0.95, equity: 0.74, index: 1.52 },
]

const MOCK_OPTION_CHAIN = {
  calls: [
    { strike: 560, lastPrice: 18.50, bid: 18.30, ask: 18.70, volume: 12450, openInterest: 45230, iv: 0.221, itm: true },
    { strike: 565, lastPrice: 14.20, bid: 14.00, ask: 14.40, volume: 8920, openInterest: 38100, iv: 0.218, itm: true },
    { strike: 570, lastPrice: 10.15, bid: 9.95,  ask: 10.35, volume: 15680, openInterest: 52400, iv: 0.215, itm: false },
    { strike: 575, lastPrice: 6.80,  bid: 6.60,  ask: 7.00,  volume: 22340, openInterest: 61200, iv: 0.213, itm: false },
    { strike: 580, lastPrice: 4.20,  bid: 4.05,  ask: 4.35,  volume: 31200, openInterest: 78500, iv: 0.211, itm: false },
    { strike: 585, lastPrice: 2.35,  bid: 2.20,  ask: 2.50,  volume: 18900, openInterest: 55300, iv: 0.210, itm: false },
    { strike: 590, lastPrice: 1.15,  bid: 1.05,  ask: 1.25,  volume: 9800,  openInterest: 42100, iv: 0.209, itm: false },
  ],
  puts: [
    { strike: 560, lastPrice: 2.10,  bid: 1.95,  ask: 2.25,  volume: 8750,  openInterest: 35600, iv: 0.225, itm: false },
    { strike: 565, lastPrice: 3.45,  bid: 3.30,  ask: 3.60,  volume: 11200, openInterest: 41800, iv: 0.228, itm: false },
    { strike: 570, lastPrice: 5.60,  bid: 5.40,  ask: 5.80,  volume: 14500, openInterest: 48200, iv: 0.232, itm: true },
    { strike: 575, lastPrice: 8.30,  bid: 8.10,  ask: 8.50,  volume: 19800, openInterest: 56700, iv: 0.235, itm: true },
    { strike: 580, lastPrice: 11.70, bid: 11.50, ask: 11.90, volume: 16400, openInterest: 49300, iv: 0.238, itm: true },
    { strike: 585, lastPrice: 15.80, bid: 15.60, ask: 16.00, volume: 7600,  openInterest: 32100, iv: 0.241, itm: true },
    { strike: 590, lastPrice: 20.50, bid: 20.30, ask: 20.70, volume: 4200,  openInterest: 21500, iv: 0.244, itm: true },
  ],
  underlying: { symbol: 'SPY', price: 568.42, change: -1.23, changePct: -0.22 },
  expirations: ['2026-03-27', '2026-04-03', '2026-04-10', '2026-04-17', '2026-05-16', '2026-06-19'],
}

// ── 포맷 유틸 ────────────────────────────────────────────────────

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—' }
function fmtVol(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toLocaleString()
}

function pcrColor(pcr) {
  if (pcr >= 1.0) return 'text-red-600'    // 약세 심리 (풋 많음)
  if (pcr >= 0.7) return 'text-gray-700'   // 중립
  return 'text-green-600'                  // 강세 심리 (콜 많음)
}

function pcrLabel(pcr) {
  if (pcr >= 1.2) return '극도 약세'
  if (pcr >= 1.0) return '약세'
  if (pcr >= 0.7) return '중립'
  if (pcr >= 0.5) return '강세'
  return '극도 강세'
}

// ── 주요 종목 ────────────────────────────────────────────────────

const POPULAR_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD']

// ── 컴포넌트 ──────────────────────────────────────────────────────

export default function UsOptionsTab() {
  const [symbol, setSymbol]         = useState('SPY')
  const [inputSymbol, setInputSymbol] = useState('')
  const [selectedExp, setSelectedExp] = useState(MOCK_OPTION_CHAIN.expirations[0])
  const [view, setView]             = useState('chain') // chain, pcr

  const pcr = MOCK_PCR_HISTORY
  const chain = MOCK_OPTION_CHAIN
  const latestPcr = pcr[pcr.length - 1]

  const totalCallOI = chain.calls.reduce((s, c) => s + c.openInterest, 0)
  const totalPutOI  = chain.puts.reduce((s, p) => s + p.openInterest, 0)
  const totalCallVol = chain.calls.reduce((s, c) => s + c.volume, 0)
  const totalPutVol  = chain.puts.reduce((s, p) => s + p.volume, 0)
  const chainPcr = totalPutVol / totalCallVol

  const handleSearch = (e) => {
    e.preventDefault()
    if (inputSymbol.trim()) {
      setSymbol(inputSymbol.trim().toUpperCase())
      setInputSymbol('')
    }
  }

  return (
    <div data-testid="us-options-tab">
      {/* 뷰 전환 + 종목 검색 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[
            { id: 'chain', label: '옵션 체인' },
            { id: 'pcr',   label: 'Put/Call Ratio' },
          ].map(v => (
            <button
              key={v.id}
              data-testid={`view-${v.id}`}
              onClick={() => setView(v.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                view === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'chain' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {POPULAR_SYMBOLS.map(s => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    symbol === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} className="flex gap-1">
              <input
                type="text"
                value={inputSymbol}
                onChange={e => setInputSymbol(e.target.value)}
                placeholder="종목 검색"
                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">검색</button>
            </form>
          </div>
        )}
      </div>

      {/* ── Put/Call Ratio 뷰 ── */}
      {view === 'pcr' && (
        <div>
          {/* PCR 요약 카드 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: '전체 P/C Ratio', value: fmtNum(latestPcr.total), color: pcrColor(latestPcr.total), sub: pcrLabel(latestPcr.total) },
              { label: '개별주식 P/C', value: fmtNum(latestPcr.equity), color: pcrColor(latestPcr.equity), sub: pcrLabel(latestPcr.equity) },
              { label: '지수 P/C', value: fmtNum(latestPcr.index), color: pcrColor(latestPcr.index), sub: pcrLabel(latestPcr.index) },
              { label: '날짜', value: latestPcr.date, color: 'text-gray-700', sub: 'CBOE 기준' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center shadow-sm">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* PCR 히스토리 테이블 */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">날짜</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">전체 P/C</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">개별주식</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">지수</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">심리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {[...pcr].reverse().map(row => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700 font-medium">{row.date}</td>
                    <td className={`px-4 py-2 text-right font-bold ${pcrColor(row.total)}`}>{fmtNum(row.total)}</td>
                    <td className={`px-4 py-2 text-right ${pcrColor(row.equity)}`}>{fmtNum(row.equity)}</td>
                    <td className={`px-4 py-2 text-right ${pcrColor(row.index)}`}>{fmtNum(row.index)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.total >= 1.0 ? 'bg-red-100 text-red-700' :
                        row.total >= 0.7 ? 'bg-gray-100 text-gray-600' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {pcrLabel(row.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            ※ P/C Ratio &gt; 1.0: 풋 옵션 거래 &gt; 콜 옵션 (약세 심리). &lt; 0.7: 강세 심리. CBOE 일간 데이터 기준.
          </p>
          <p className="text-xs text-orange-500 mt-1">※ 현재 모의 데이터입니다. CBOE 실제 데이터 연동 예정.</p>
        </div>
      )}

      {/* ── 옵션 체인 뷰 ── */}
      {view === 'chain' && (
        <div>
          {/* 종목 정보 + 만기 선택 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {chain.underlying.symbol}
                <span className="ml-2 text-base font-normal text-gray-500">${fmtNum(chain.underlying.price)}</span>
                <span className={`ml-2 text-sm ${chain.underlying.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {chain.underlying.change >= 0 ? '+' : ''}{fmtNum(chain.underlying.change)} ({fmtNum(chain.underlying.changePct)}%)
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">만기일:</span>
              <select
                value={selectedExp}
                onChange={e => setSelectedExp(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                {chain.expirations.map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: '콜 거래량', value: fmtVol(totalCallVol), color: 'text-green-600' },
              { label: '풋 거래량', value: fmtVol(totalPutVol), color: 'text-red-600' },
              { label: 'P/C 거래량', value: fmtNum(chainPcr), color: pcrColor(chainPcr) },
              { label: '콜 OI', value: fmtVol(totalCallOI), color: 'text-green-600' },
              { label: '풋 OI', value: fmtVol(totalPutOI), color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 p-2.5 text-center shadow-sm">
                <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* 옵션 체인 테이블 — 콜 | 행사가 | 풋 */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-xs" data-testid="option-chain-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th colSpan="5" className="px-2 py-1.5 text-center text-xs font-bold text-green-700 bg-green-50 border-r border-gray-200">CALLS</th>
                  <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-700 bg-gray-100">행사가</th>
                  <th colSpan="5" className="px-2 py-1.5 text-center text-xs font-bold text-red-700 bg-red-50 border-l border-gray-200">PUTS</th>
                </tr>
                <tr className="text-gray-500">
                  <th className="px-2 py-1 text-right font-semibold">최종가</th>
                  <th className="px-2 py-1 text-right font-semibold">Bid</th>
                  <th className="px-2 py-1 text-right font-semibold">Ask</th>
                  <th className="px-2 py-1 text-right font-semibold">거래량</th>
                  <th className="px-2 py-1 text-right font-semibold border-r border-gray-200">OI</th>
                  <th className="px-2 py-1 text-center font-semibold bg-gray-50">Strike</th>
                  <th className="px-2 py-1 text-right font-semibold border-l border-gray-200">최종가</th>
                  <th className="px-2 py-1 text-right font-semibold">Bid</th>
                  <th className="px-2 py-1 text-right font-semibold">Ask</th>
                  <th className="px-2 py-1 text-right font-semibold">거래량</th>
                  <th className="px-2 py-1 text-right font-semibold">OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chain.calls.map((call, i) => {
                  const put = chain.puts[i]
                  const isAtm = Math.abs(call.strike - chain.underlying.price) < 2.5
                  return (
                    <tr key={call.strike} className={`hover:bg-gray-50 ${isAtm ? 'bg-yellow-50' : ''}`}>
                      {/* CALL side */}
                      <td className={`px-2 py-1.5 text-right font-medium ${call.itm ? 'bg-green-50 text-green-800' : 'text-gray-700'}`}>${fmtNum(call.lastPrice)}</td>
                      <td className={`px-2 py-1.5 text-right ${call.itm ? 'bg-green-50' : ''} text-gray-500`}>${fmtNum(call.bid)}</td>
                      <td className={`px-2 py-1.5 text-right ${call.itm ? 'bg-green-50' : ''} text-gray-500`}>${fmtNum(call.ask)}</td>
                      <td className={`px-2 py-1.5 text-right ${call.itm ? 'bg-green-50' : ''} text-gray-600`}>{fmtVol(call.volume)}</td>
                      <td className={`px-2 py-1.5 text-right border-r border-gray-200 ${call.itm ? 'bg-green-50' : ''} text-gray-600`}>{fmtVol(call.openInterest)}</td>
                      {/* Strike */}
                      <td className={`px-2 py-1.5 text-center font-bold ${isAtm ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 text-gray-900'}`}>
                        ${call.strike}
                      </td>
                      {/* PUT side */}
                      <td className={`px-2 py-1.5 text-right border-l border-gray-200 font-medium ${put.itm ? 'bg-red-50 text-red-800' : 'text-gray-700'}`}>${fmtNum(put.lastPrice)}</td>
                      <td className={`px-2 py-1.5 text-right ${put.itm ? 'bg-red-50' : ''} text-gray-500`}>${fmtNum(put.bid)}</td>
                      <td className={`px-2 py-1.5 text-right ${put.itm ? 'bg-red-50' : ''} text-gray-500`}>${fmtNum(put.ask)}</td>
                      <td className={`px-2 py-1.5 text-right ${put.itm ? 'bg-red-50' : ''} text-gray-600`}>{fmtVol(put.volume)}</td>
                      <td className={`px-2 py-1.5 text-right ${put.itm ? 'bg-red-50' : ''} text-gray-600`}>{fmtVol(put.openInterest)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-50 border border-green-200 inline-block" /> ITM (콜)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-50 border border-red-200 inline-block" /> ITM (풋)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-yellow-50 border border-yellow-200 inline-block" /> ATM (현재가 근처)</span>
            <span>IV = 내재 변동성 · OI = 미결제약정</span>
          </div>
          <p className="text-xs text-orange-500 mt-1">※ 현재 모의 데이터입니다. Yahoo Finance 옵션 체인 실제 연동 예정.</p>
        </div>
      )}
    </div>
  )
}
