"""日期边界工具。

数据库中的 ``created_at`` 以 UTC 朴素时间保存，而用户在界面上选择的是
本地日期。这里把「本地某一天 00:00」换算成 UTC 朴素时间，保证筛选结果
与用户所在时区一致。
"""

from datetime import date, datetime, time, timezone


def local_day_start_utc(day: date) -> datetime:
    """返回本地日期 ``day`` 零点对应的 UTC 朴素时间。"""

    local_midnight = datetime.combine(day, time.min).astimezone()
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)
