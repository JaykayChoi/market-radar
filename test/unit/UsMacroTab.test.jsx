/**
 * UsMacroTab 컴포넌트 유닛 테스트
 * 실행: npx vitest run test/unit/UsMacroTab.test.jsx
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import UsMacroTab from '../../src/components/tabs/UsMacroTab'

const MOCK_DATA = [
  { key: 'fed_rate',     series_id: 'DFF',        date: '2026-03-19', value: 3.64 },
  { key: 't2y',          series_id: 'GS2',         date: '2026-03-19', value: 3.47 },
  { key: 't10y',         series_id: 'GS10',        date: '2026-02-01', value: 4.13 },
  { key: 'spread_10y2y', series_id: 'T10Y2Y',      date: '2026-03-20', value: 0.51 },
  { key: 'vix',          series_id: 'VIXCLS',      date: '2026-03-19', value: 24.06 },
  { key: 'hy_spread',    series_id: 'BAMLH0A0HYM2',date: '2026-03-19', value: 3.27 },
  { key: 'usdkrw',       series_id: 'DEXKOUS',     date: '2026-03-13', value: 1498.88 },
  { key: 'dxy',          series_id: 'DTWEXBGS',    date: '2026-03-13', value: 120.55 },
  { key: 'unemployment', series_id: 'UNRATE',      date: '2026-02-01', value: 4.4 },
  { key: 'core_pce',     series_id: 'PCEPILFE',    date: '2026-01-01', value: 128.39 },
]

function mockFetch(data, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  }))
}

describe('UsMacroTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('로딩 중 로딩 인디케이터를 표시한다', () => {
    // fetch가 resolve되기 전 상태를 잡기 위해 pending promise 사용
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    render(<UsMacroTab />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  test('데이터 로드 성공 시 지표 카드가 렌더링된다', async () => {
    mockFetch({ data: MOCK_DATA })
    render(<UsMacroTab />)

    await waitFor(() => {
      expect(screen.getByTestId('us-macro-tab')).toBeInTheDocument()
    })

    expect(screen.getByTestId('metric-card-fed_rate')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-vix')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-usdkrw')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-unemployment')).toBeInTheDocument()
  })

  test('기준금리 값이 표시된다', async () => {
    mockFetch({ data: MOCK_DATA })
    render(<UsMacroTab />)

    await waitFor(() => screen.getByTestId('metric-card-fed_rate'))
    const card = screen.getByTestId('metric-card-fed_rate')
    expect(card).toHaveTextContent('3.64')
  })

  test('원/달러는 천 단위 구분자로 표시된다', async () => {
    mockFetch({ data: MOCK_DATA })
    render(<UsMacroTab />)

    await waitFor(() => screen.getByTestId('metric-card-usdkrw'))
    const card = screen.getByTestId('metric-card-usdkrw')
    expect(card).toHaveTextContent('1,499')
  })

  test('value가 null이면 "—"을 표시한다', async () => {
    const dataWithNull = MOCK_DATA.map(d =>
      d.key === 'vix' ? { ...d, value: null } : d
    )
    mockFetch({ data: dataWithNull })
    render(<UsMacroTab />)

    await waitFor(() => screen.getByTestId('metric-card-vix'))
    const card = screen.getByTestId('metric-card-vix')
    expect(card).toHaveTextContent('—')
  })

  test('카테고리 섹션 헤더가 표시된다', async () => {
    mockFetch({ data: MOCK_DATA })
    render(<UsMacroTab />)

    await waitFor(() => screen.getByTestId('us-macro-tab'))
    expect(screen.getByText('금리')).toBeInTheDocument()
    expect(screen.getByText('시장')).toBeInTheDocument()
    expect(screen.getByText('환율')).toBeInTheDocument()
    expect(screen.getByText('고용')).toBeInTheDocument()
    expect(screen.getByText('물가')).toBeInTheDocument()
  })

  test('API HTTP 오류 시 에러 상태를 표시한다', async () => {
    mockFetch({}, false, 500)
    render(<UsMacroTab />)

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('error')).toHaveTextContent('데이터 로드 실패')
  })

  test('네트워크 오류 시 에러 상태를 표시한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    render(<UsMacroTab />)

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument()
    })
  })

  test('/api/fred/multi 엔드포인트를 올바른 keys로 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: MOCK_DATA }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<UsMacroTab />)

    await waitFor(() => screen.getByTestId('us-macro-tab'))
    expect(fetchMock).toHaveBeenCalledOnce()
    const url = fetchMock.mock.calls[0][0]
    expect(url).toMatch('/api/fred/multi')
    expect(url).toMatch('fed_rate')
    expect(url).toMatch('vix')
  })

  test('출처 텍스트가 표시된다', async () => {
    mockFetch({ data: MOCK_DATA })
    render(<UsMacroTab />)
    await waitFor(() => screen.getByTestId('us-macro-tab'))
    expect(screen.getByText(/FRED/)).toBeInTheDocument()
  })
})
