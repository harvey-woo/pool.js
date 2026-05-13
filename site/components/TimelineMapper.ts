/**
 * TimelineMapper (重新设计版本)
 *
 * 设计理念：
 *   - 时间轴范围灵活可配：可基于事件范围自动确定，也可指定固定范围
 *   - 时间轴按统一比例缩放（不管是否有事件）
 *   - 空闲时间压缩是可选的，通过回调函数决定
 *   - 如果没有空闲压缩回调，则所有时间都按统一比例缩放
 *   - 时间轴以最后事件的结束时间为准，不计算事件后的空闲时间
 */

export interface Duration {
  from: number
  to: number
}

// 空闲时间压缩回调函数类型
export type IdleCompressCallback = (idleSlot: Duration) => number

// 添加类型守卫
export function isDuration(obj: unknown): obj is Duration {
  if (!obj || typeof obj !== 'object') return false
  const candidate = obj as Record<string, unknown>
  return (
    typeof candidate.from === 'number' &&
    typeof candidate.to === 'number' &&
    Number.isFinite(candidate.from) &&
    Number.isFinite(candidate.to) &&
    candidate.from <= candidate.to
  )
}

type SegmentType = 'normal' | 'idle'

interface SegmentInfo {
  type: SegmentType
  from: number // 绝对起点
  to: number // 绝对终点
  relStart: number // 相对起点
  relLen: number // 相对段长
  scale: number // rel = (abs‑from) × scale
  invScale: number // abs = (rel‑relStart) × invScale
}

// 添加查询结果接口
export interface TimelineStats {
  totalNormalSegments: number
  totalIdleSegments: number
  totalAbsLength: number
  totalRelLength: number
  segmentCount: number
  timeScale: number
  compressionRatio: number
}

export class TimelineMapper {
  /* ---------------- public API ---------------- */

  readonly timeScale: number
  readonly idleCompressCallback?: IdleCompressCallback

  private segments: SegmentInfo[] = []
  private timelineStart?: number
  private timelineEnd?: number
  private relCursor = 0

  /**
   * @param allEvents  所有事件列表（用于识别空闲区间）
   * @param timeScale   时间轴统一缩放比例（像素/毫秒）
   * @param idleCompressCallback  可选的空闲时间压缩回调函数
   * @param timelineStart  可选的时间轴开始时间，如果不提供则基于事件范围自动确定
   * @param timelineEnd  可选的时间轴结束时间（注意：实际结束时间将以最后事件的结束时间为准，不会在事件后添加额外的空闲时间）
   */
  constructor(
    allEvents: Duration[],
    timeScale: number,
    idleCompressCallback?: IdleCompressCallback,
    timelineStart?: number,
    timelineEnd?: number
  ) {
    // 参数验证
    if (!Number.isFinite(timeScale) || timeScale <= 0) {
      throw new Error('timeScale must be a positive finite number')
    }
    if (
      timelineStart !== undefined &&
      (!Number.isFinite(timelineStart) || timelineStart < 0)
    ) {
      throw new Error('timelineStart must be a non-negative finite number')
    }
    if (
      timelineEnd !== undefined &&
      (!Number.isFinite(timelineEnd) || timelineEnd < 0)
    ) {
      throw new Error('timelineEnd must be a non-negative finite number')
    }
    if (
      timelineStart !== undefined &&
      timelineEnd !== undefined &&
      timelineStart >= timelineEnd
    ) {
      throw new Error('timelineStart must be less than timelineEnd')
    }

    // 验证输入事件的有效性
    if (!Array.isArray(allEvents)) {
      throw new Error('allEvents must be an array')
    }

    this.validateEvents(allEvents)

    this.timeScale = timeScale
    this.idleCompressCallback = idleCompressCallback
    this.timelineStart = timelineStart
    this.timelineEnd = timelineEnd

    // 构建时间轴段
    this.buildSegments(allEvents)
  }

  /** 绝对时间 → 相对位置（像素）；若 t 不在时间轴范围内返回 undefined */
  absToRel(t: number): number | undefined {
    if (!Number.isFinite(t) || t < 0) return undefined

    const idx = this.findSegmentByAbs(t)
    if (idx < 0) return undefined

    const seg = this.segments[idx]
    return seg.relStart + (t - seg.from) * seg.scale
  }

  /** 相对位置（像素）→ 绝对时间；超出范围返回 undefined */
  relToAbs(rel: number): number | undefined {
    if (!Number.isFinite(rel) || rel < 0) return undefined

    const idx = this.findSegmentByRel(rel)
    if (idx < 0) return undefined

    const seg = this.segments[idx]
    return seg.from + (rel - seg.relStart) * seg.invScale
  }

  /** 批量转换绝对时间到相对位置 */
  batchAbsToRel(times: number[]): (number | undefined)[] {
    return times.map((t) => this.absToRel(t))
  }

  /** 批量转换相对位置到绝对时间 */
  batchRelToAbs(times: number[]): (number | undefined)[] {
    return times.map((t) => this.relToAbs(t))
  }

  /** 检查绝对时间是否在空闲时间段内 */
  isInIdle(absTime: number): boolean {
    const idx = this.findSegmentByAbs(absTime)
    return idx >= 0 && this.segments[idx].type === 'idle'
  }

  /** 检查绝对时间是否在正常时间段内 */
  isInNormal(absTime: number): boolean {
    const idx = this.findSegmentByAbs(absTime)
    return idx >= 0 && this.segments[idx].type === 'normal'
  }

  /** 获取时间轴统计信息 */
  getStats(): TimelineStats {
    let totalNormalSegments = 0
    let totalIdleSegments = 0
    let totalAbsLength = 0
    let totalRelLength = 0

    for (const seg of this.segments) {
      if (seg.type === 'normal') {
        totalNormalSegments++
      } else {
        totalIdleSegments++
      }
      totalAbsLength += seg.to - seg.from
      totalRelLength += seg.relLen
    }

    const compressionRatio =
      totalAbsLength > 0
        ? totalRelLength / (totalAbsLength * this.timeScale)
        : 1

    return {
      totalNormalSegments,
      totalIdleSegments,
      totalAbsLength,
      totalRelLength,
      segmentCount: this.segments.length,
      timeScale: this.timeScale,
      compressionRatio
    }
  }

  /** 返回 segment 列表（深拷贝，调试/展示用） */
  getSegmentList(): SegmentInfo[] {
    return this.segments.map((seg) => ({ ...seg }))
  }

  /** 获取所有空闲时间段 */
  getIdleSlots(): Duration[] {
    return this.segments
      .filter((seg) => seg.type === 'idle')
      .map((seg) => ({ from: seg.from, to: seg.to }))
  }

  /** 获取所有正常时间段 */
  getNormalSlots(): Duration[] {
    return this.segments
      .filter((seg) => seg.type === 'normal')
      .map((seg) => ({ from: seg.from, to: seg.to }))
  }

  /** 当前时间轴绝对起点 */
  get timelineStartAbs(): number | undefined {
    return this.timelineStart
  }

  /** 当前时间轴绝对终点 */
  get timelineEndAbs(): number | undefined {
    return this.timelineEnd
  }

  /** 当前时间轴相对终点 */
  get timelineEndRel(): number {
    return this.relCursor
  }

  /** 检查时间轴是否为空 */
  get isEmpty(): boolean {
    return this.segments.length === 0
  }

  /* ---------------- implementation ---------------- */

  /** 验证事件数组的有效性 */
  private validateEvents(events: Duration[]): void {
    for (let i = 0; i < events.length; i++) {
      if (!isDuration(events[i])) {
        throw new Error(
          `Invalid event at index ${i}: must have valid 'from' and 'to' numbers with from <= to`
        )
      }
    }
  }

  /** 构建时间轴段 */
  private buildSegments(allEvents: Duration[]): void {
    // 确定时间轴的实际范围
    let actualTimelineStart: number
    let actualTimelineEnd: number

    if (allEvents.length === 0) {
      // 没有事件时的处理
      if (this.timelineStart !== undefined && this.timelineEnd !== undefined) {
        actualTimelineStart = this.timelineStart
        actualTimelineEnd = this.timelineEnd

        if (this.idleCompressCallback) {
          // 整个时间轴作为空闲段
          this.addSegment('idle', actualTimelineStart, actualTimelineEnd, {
            from: actualTimelineStart,
            to: actualTimelineEnd
          })
        } else {
          // 整个时间轴作为正常段
          this.addSegment('normal', actualTimelineStart, actualTimelineEnd)
        }
      }
      // 如果没有指定时间轴边界且没有事件，时间轴为空
      return
    }

    // 有事件时，确定实际的时间轴范围
    const minEventTime = Math.min(...allEvents.map((e) => e.from))
    const maxEventTime = Math.max(...allEvents.map((e) => e.to))

    actualTimelineStart =
      this.timelineStart !== undefined
        ? Math.min(this.timelineStart, minEventTime)
        : minEventTime

    actualTimelineEnd =
      this.timelineEnd !== undefined
        ? Math.max(this.timelineEnd, maxEventTime)
        : maxEventTime

    // 如果没有空闲压缩回调，整个时间轴作为一个正常段
    if (!this.idleCompressCallback) {
      this.addSegment('normal', actualTimelineStart, actualTimelineEnd)
      return
    }

    // 合并重叠事件，找出空闲区间
    const mergedEvents = this.mergeEvents(allEvents)
    const idleSlots = this.findIdleSlots(
      mergedEvents,
      actualTimelineStart,
      actualTimelineEnd
    )

    let currentTime = actualTimelineStart

    // 交替添加正常段和空闲段
    for (const idleSlot of idleSlots) {
      // 添加空闲段之前的正常段
      if (currentTime < idleSlot.from) {
        this.addSegment('normal', currentTime, idleSlot.from)
      }

      // 添加空闲段
      this.addSegment('idle', idleSlot.from, idleSlot.to, idleSlot)

      currentTime = idleSlot.to
    }

    // 添加最后的正常段（如果有剩余时间）
    if (currentTime < actualTimelineEnd) {
      this.addSegment('normal', currentTime, actualTimelineEnd)
    }
  }

  /** 添加一个段并推进 relCursor */
  private addSegment(
    type: SegmentType,
    from: number,
    to: number,
    idleSlot?: Duration
  ): void {
    const absLen = to - from
    let relLen: number

    if (type === 'idle' && idleSlot && this.idleCompressCallback) {
      // 使用回调函数计算空闲段的相对长度
      relLen = this.idleCompressCallback(idleSlot)
    } else {
      // 正常段或没有压缩回调时，按时间比例缩放
      relLen = absLen * this.timeScale
    }

    // 防止除零错误
    const scale = absLen === 0 ? 0 : relLen / absLen
    const invScale = relLen === 0 ? 0 : absLen / relLen

    this.segments.push({
      type,
      from,
      to,
      relStart: this.relCursor,
      relLen,
      scale,
      invScale
    })
    this.relCursor += relLen
  }

  /** 找出所有空闲时间段 */
  private findIdleSlots(
    mergedEvents: Duration[],
    timelineStart: number,
    timelineEnd: number
  ): Duration[] {
    if (mergedEvents.length === 0) {
      // 没有事件，整个时间轴都是空闲
      return [{ from: timelineStart, to: timelineEnd }]
    }

    const idleSlots: Duration[] = []
    let currentTime = timelineStart

    for (const event of mergedEvents) {
      // 事件前的空闲时间
      if (currentTime < event.from) {
        idleSlots.push({ from: currentTime, to: event.from })
      }
      currentTime = Math.max(currentTime, event.to)
    }

    // 不再计算最后一个事件后的空闲时间
    return idleSlots
  }

  /** 二分：按绝对时间查 segment 下标 */
  private findSegmentByAbs(t: number): number {
    let l = 0
    let r = this.segments.length - 1
    while (l <= r) {
      const m = Math.floor((l + r) / 2)
      const s = this.segments[m]
      if (t < s.from) {
        r = m - 1
      } else if (t > s.to) {
        l = m + 1
      } else {
        return m
      }
    }
    return -1
  }

  /** 二分：按相对位置查 segment 下标 */
  private findSegmentByRel(rel: number): number {
    let l = 0
    let r = this.segments.length - 1
    while (l <= r) {
      const m = Math.floor((l + r) / 2)
      const s = this.segments[m]
      const relEnd = s.relStart + s.relLen
      if (rel < s.relStart) {
        r = m - 1
      } else if (rel > relEnd) {
        l = m + 1
      } else {
        return m
      }
    }
    return -1
  }

  /** 排序并合并重叠事件段 */
  private mergeEvents(events: Duration[]): Duration[] {
    if (!events.length) return []

    const sorted = events.slice().sort((a, b) => a.from - b.from || a.to - b.to)
    const merged: Duration[] = []

    let current = { ...sorted[0] }

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i]
      if (next.from <= current.to) {
        current.to = Math.max(current.to, next.to)
      } else {
        merged.push(current)
        current = { ...next }
      }
    }
    merged.push(current)

    return merged
  }
}
