import type { CodeExample } from "./types";

/**
 * 代码示例页的 Python 实现。
 *
 * 与 C# / Java 版本保持一一对应的结构：串口连接、TCP 连接、帧解析器、
 * 断线重连与看门狗、生理参数输出，便于跨语言逐节对照。
 *
 * 依赖说明：
 *   - 串口：pyserial（pip install pyserial）
 *   - 其余仅用标准库
 */

const pythonSerial = `"""监护仪串口连接示例（Python 3.10+）

依赖：pyserial

    pip install pyserial

串口是字节流，边界需要自己找。本示例演示打开串口、清空缓冲、
以及带超时的命令往返。

以 Philips IntelliVue / GE CARESCAPE 等常见 9600~115200 8N1 设备为例。
"""

from __future__ import annotations

import time

import serial


class MonitorSerialClient:
    """监护仪串口连接客户端。"""

    def __init__(self, port: str = "COM3", baudrate: int = 115200, timeout: float = 2.0) -> None:
        # timeout 关键：避免 read 永久阻塞
        self.port = serial.Serial(
            port=port,
            baudrate=baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=timeout,
        )
        # 打开设备前先清空缓冲，避免上电自检的残留数据干扰首帧解析
        self.port.reset_input_buffer()
        self.port.reset_output_buffer()

    def close(self) -> None:
        if self.port.is_open:
            self.port.close()

    def __enter__(self) -> "MonitorSerialClient":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def send_and_receive(self, command: bytes, timeout: float = 2.0) -> bytes:
        """发送一条命令并等待设备应答。

        实际项目中应改为基于事件驱动的帧缓存读取，
        这里用「读到帧尾或超时」作为结束条件。
        """
        self.port.write(command)

        buffer = bytearray()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            chunk = self.port.read(256)
            if not chunk:
                continue
            buffer.extend(chunk)
            if self._is_frame_complete(buffer):
                break
        return bytes(buffer)

    @staticmethod
    def _is_frame_complete(buffer: bytearray) -> bool:
        """判断是否已收到完整一帧。

        以换行或 ETX 判定帧结束，视具体协议调整。
        """
        return b"\\n" in buffer or b"\\r" in buffer or bytes([0x04]) in buffer


def main() -> None:
    with MonitorSerialClient("COM3", 115200) as client:
        # 请求心率与血氧。以 Philips 为例，命令字随机型不同需查阅手册。
        response = client.send_and_receive(b"HR?\\r", timeout=2.0)
        print(f"设备返回：{response!r}")

        # 生产环境建议改为后台线程持续读取 + 事件回调上报。


if __name__ == "__main__":
    main()
`;

const pythonTcp = `"""监护仪 TCP 连接示例（Python 3.10+）

通过 TCP 连接设备的以太网接口，演示定长读取与 STX/ETX 帧边界识别。
适用于迈瑞 NetComm、Dräger DRX 等提供以太网接口的设备。

仅使用标准库。
"""

from __future__ import annotations

import socket
import time
from typing import Iterator

# STX / ETX，用于在 TCP 字节流中识别帧边界
STX = 0x0B
ETX = 0x0D


class MonitorTcpClient:
    """监护仪 TCP 连接客户端。"""

    def __init__(self, host: str = "192.168.1.50", port: int = 5180, timeout: float = 5.0) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self.sock: socket.socket | None = None

    def connect(self) -> None:
        self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        # TCP_NODELAY：避免 Nagle 算法把小报文攒起来，显著增加实时数据的延迟
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.settimeout(self.timeout)

    def close(self) -> None:
        if self.sock is not None:
            self.sock.close()
            self.sock = None

    def __enter__(self) -> "MonitorTcpClient":
        self.connect()
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def send(self, payload: bytes) -> None:
        if self.sock is None:
            raise RuntimeError("尚未连接")
        self.sock.sendall(payload)

    def iter_frames(self) -> Iterator[bytes]:
        """持续产出完整帧。

        设备既可能用 STX/ETX 定界，也可能用长度字段定界，
        这里以 STX/ETX 为例；切换到长度字段协议时替换切分逻辑即可。
        """
        if self.sock is None:
            raise RuntimeError("尚未连接")

        buffer = bytearray()
        while True:
            chunk = self.sock.recv(4096)
            if not chunk:
                # 对端关闭
                return
            buffer.extend(chunk)

            while True:
                start = buffer.find(bytes([STX]))
                if start < 0:
                    # 保留可能构成 STX 前缀的末尾字节
                    if len(buffer) > 1:
                        del buffer[:-1]
                    break
                if start > 0:
                    del buffer[:start]

                end = buffer.find(bytes([ETX]), 1)
                if end < 0:
                    # 帧未到齐，继续等待
                    break

                frame = bytes(buffer[: end + 1])
                del buffer[: end + 1]
                yield frame


def main() -> None:
    with MonitorTcpClient("192.168.1.50", 5180) as client:
        client.send(b"\\x0b\\x01\\x00\\x01\\x00\\x00\\x0d")

        for frame in client.iter_frames():
            print(f"收到 {len(frame)} 字节：{frame.hex(' ')}")


if __name__ == "__main__":
    main()
`;

const pythonParser = `"""Philips IntelliVue 帧解析器（Python 3.10+）

从字节流中切分完整帧，校验帧尾与校验和，解析测量项编号与数值。

帧格式
------
    STX(0x0B) | Type(1) | Seq(2) | Len(2) | Payload(N) | Sum(1) | ETX(0x0D)

校验和为帧类型至负载区末字节的累加和低 8 位，不含 STX 与 ETX。

仅使用标准库。
"""

from __future__ import annotations

from dataclasses import dataclass, field

STX = 0x0B
ETX = 0x0D

# 测量项 ID -> 名称
PARAM_NAMES: dict[int, str] = {
    0x0003: "HR",
    0x0004: "SpO2",
    0x0005: "RR",
    0x000A: "NIBP_S",
    0x000B: "NIBP_D",
}


@dataclass
class Frame:
    """解析出的一帧。"""

    raw: bytes
    frame_type: int
    sequence: int
    values: dict[str, float] = field(default_factory=dict)


class IntelliVueFrameParser:
    """IntelliVue 帧解析器。

    串口与 TCP 都是字节流，帧边界需要自己找。
    本实现用一个缓冲区缓存，每次 feed 追加新数据并尝试切出完整帧；
    数据不足时保留在缓冲区等待后续字节。
    """

    def __init__(self) -> None:
        self._buf = bytearray()

    def feed(self, chunk: bytes) -> list[Frame]:
        """把新收到的字节喂入解析器，返回本次能切出的完整帧列表。"""
        self._buf.extend(chunk)
        frames: list[Frame] = []
        while True:
            frame = self._try_parse()
            if frame is None:
                return frames
            frames.append(frame)

    def _try_parse(self) -> Frame | None:
        buf = self._buf

        # 1) 定位 STX
        idx = buf.find(bytes([STX]))
        if idx < 0:
            # 保留可能构成 STX 前缀的末尾字节
            if len(buf) > 1:
                del buf[:-1]
            return None
        if idx > 0:
            del buf[:idx]

        # 2) 头部至少需要 Type + Seq + Len 共 5 字节
        if len(buf) < 6:
            return None

        frame_type = buf[1]
        sequence = int.from_bytes(buf[2:4], "big")
        length = int.from_bytes(buf[4:6], "big")

        # 3) 整帧是否到齐：STX + 头(5) + 负载 + 校验(1) + ETX
        total = 7 + length
        if len(buf) < total:
            return None

        # 4) 帧尾校验
        if buf[total - 1] != ETX:
            # 不是本帧，丢弃第一个字节重新同步
            del buf[:1]
            return None

        # 5) 校验和：帧类型至负载区末字节的累加和低 8 位
        expected = sum(buf[1 : total - 2]) & 0xFF
        actual = buf[total - 2]
        if expected != actual:
            raise ValueError(f"校验失败: 期望 0x{expected:02X}, 实际 0x{actual:02X}")

        payload = bytes(buf[6 : total - 2])
        frame = Frame(raw=bytes(buf[:total]), frame_type=frame_type, sequence=sequence)
        frame.values = self._decode_payload(payload)

        del buf[:total]
        return frame

    @staticmethod
    def _decode_payload(payload: bytes) -> dict[str, float]:
        """按「参数ID(2) + 数值(2)」的格式解析负载区。"""
        values: dict[str, float] = {}
        for offset in range(0, len(payload) - 3, 4):
            param_id = int.from_bytes(payload[offset : offset + 2], "big")
            raw = int.from_bytes(payload[offset + 2 : offset + 4], "big")
            name = PARAM_NAMES.get(param_id)
            if name is None:
                # 未知参数直接跳过，避免整帧解析失败
                continue
            values[name] = float(raw)
        return values


if __name__ == "__main__":
    # 自检：用协议页的示例报文验证解析器
    SAMPLE = bytes.fromhex("0B02001F00080003005A000400620E0D")
    parser = IntelliVueFrameParser()
    frames = parser.feed(SAMPLE)
    assert len(frames) == 1, f"应解析出 1 帧，实际 {len(frames)} 帧"
    print(f"帧长度: {len(frames[0].raw)} 字节")
    print("解析结果:", frames[0].values)
`;

const pythonReconnect = `"""断线重连与看门狗示例（Python 3.10+）

以数据静默超时作为主要断线判据，配合指数退避重连，
避免设备断电时日志刷屏。

仅使用标准库。
"""

from __future__ import annotations

import logging
import random
import socket
import threading
import time
from typing import Callable

logger = logging.getLogger(__name__)

# 多久没有收到任何数据就认为链路已断
SILENCE_TIMEOUT = 10.0
# 指数退避的上限，避免无限拉长间隔
MAX_BACKOFF = 60.0


class ReconnectingMonitorClient:
    """带看门狗与指数退避重连的监护仪客户端。"""

    def __init__(
        self,
        host: str = "192.168.1.50",
        port: int = 5180,
        on_frame: Callable[[bytes], None] | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.on_frame = on_frame
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_rx = time.monotonic()

    def start(self) -> None:
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="monitor-client", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None

    def _run(self) -> None:
        attempt = 0
        while not self._stop.is_set():
            try:
                self._connect_and_read()
                attempt = 0
            except (OSError, ConnectionError) as exc:
                attempt += 1
                delay = min(MAX_BACKOFF, 2 ** min(attempt, 6))
                # 抖动：避免多台采集端同时重连造成设备侧压力
                delay += random.uniform(0, delay * 0.2)
                logger.warning("连接断开（%s），%.1f 秒后重连（第 %d 次）", exc, delay, attempt)
                self._stop.wait(delay)

    def _connect_and_read(self) -> None:
        with socket.create_connection((self.host, self.port), timeout=5.0) as sock:
            sock.settimeout(1.0)
            logger.info("已连接到 %s:%d", self.host, self.port)
            self._last_rx = time.monotonic()

            while not self._stop.is_set():
                try:
                    chunk = sock.recv(4096)
                except socket.timeout:
                    # 超时不代表断开，用静默时长判断
                    if time.monotonic() - self._last_rx > SILENCE_TIMEOUT:
                        raise TimeoutError(f"{SILENCE_TIMEOUT:.0f} 秒未收到数据，判定链路已断")
                    continue

                if not chunk:
                    raise ConnectionError("对端关闭了连接")

                self._last_rx = time.monotonic()
                if self.on_frame is not None:
                    self.on_frame(chunk)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    client = ReconnectingMonitorClient(on_frame=lambda data: print(f"收到 {len(data)} 字节"))
    client.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.stop()


if __name__ == "__main__":
    main()
`;

const pythonVitals = `"""生理参数映射与输出示例（Python 3.10+）

把帧解析结果映射为带单位的参数对象，严格区分「无效读数」与「真实数值 0」，
并输出为 JSON 风格文本。

仅使用标准库。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

# 参数名 -> (单位, 正常范围下限, 正常范围上限)
PARAM_META: dict[str, tuple[str, float, float]] = {
    "HR": ("bpm", 40.0, 160.0),
    "SpO2": ("%", 90.0, 100.0),
    "RR": ("bpm", 8.0, 30.0),
    "NIBP_S": ("mmHg", 90.0, 160.0),
    "NIBP_D": ("mmHg", 60.0, 110.0),
    "EtCO2": ("mmHg", 25.0, 60.0),
}


@dataclass
class Vital:
    """一个带单位的生理参数读数。"""

    name: str
    value: float | None
    unit: str
    in_range: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "in_range": self.in_range,
        }


class VitalFormatter:
    """把解析结果映射为带单位的参数对象。"""

    def __init__(self) -> None:
        self._vitals: dict[str, Vital] = {}

    def update(self, values: dict[str, float]) -> None:
        """用一帧的解析结果更新参数状态。

        设备在测量无效时可能上报 0，这和「真实的 0」不是一回事。
        这里按范围判断：超出生理可能范围且等于 0 的读数标记为无效。
        """
        for name, value in values.items():
            unit, low, high = PARAM_META.get(name, ("", float("-inf"), float("inf")))

            if value == 0 and not (low <= 0 <= high):
                # 设备用 0 表示「当前无有效测量」
                self._vitals[name] = Vital(name=name, value=None, unit=unit, in_range=None)
                continue

            self._vitals[name] = Vital(
                name=name,
                value=value,
                unit=unit,
                in_range=low <= value <= high,
            )

    def to_json(self) -> str:
        """输出为 JSON 风格文本。"""
        payload = [vital.to_dict() for vital in self._vitals.values()]
        return json.dumps(payload, ensure_ascii=False, indent=2)

    def to_text(self) -> str:
        """输出为一行一参数的文本，便于日志查看。"""
        lines = []
        for vital in self._vitals.values():
            if vital.value is None:
                lines.append(f"{vital.name}: -- {vital.unit}")
                continue
            flag = "" if vital.in_range else "  (超出正常范围)"
            lines.append(f"{vital.name}: {vital.value:g} {vital.unit}{flag}")
        return "\\n".join(lines)


if __name__ == "__main__":
    formatter = VitalFormatter()
    formatter.update({"HR": 72.0, "SpO2": 98.0, "RR": 0.0})
    print(formatter.to_text())
    print()
    print(formatter.to_json())
`;

export const pythonCodeExamples: CodeExample[] = [
  {
    slug: "serial-connect",
    title: "串口连接",
    desc: "使用 pyserial 打开串口，处理超时与字节流边界，适用于 Windows 与 Linux 环境。",
    lang: "python",
    filename: "monitor_serial_client.py",
    dependency: "pyserial",
    code: pythonSerial,
  },
  {
    slug: "tcp-connect",
    title: "TCP 连接",
    desc: "Python 版 TCP 连接实现，包含 STX/ETX 帧边界识别与连接参数设置。",
    lang: "python",
    filename: "monitor_tcp_client.py",
    code: pythonTcp,
  },
  {
    slug: "frame-parser",
    title: "帧解析器",
    desc: "Python 版帧解析器，同样的边界识别与校验逻辑，可与 C# 实现逐行对照。",
    lang: "python",
    filename: "intellivue_frame_parser.py",
    code: pythonParser,
  },
  {
    slug: "reconnect",
    title: "断线重连与看门狗",
    desc: "Python 版重连实现，使用线程做看门狗检测与指数退避重连。",
    lang: "python",
    filename: "reconnecting_monitor_client.py",
    code: pythonReconnect,
  },
  {
    slug: "vital-output",
    title: "读取生理参数并输出",
    desc: "Python 版参数映射与输出，逻辑与 C# 版一致，便于跨语言对照与迁移。",
    lang: "python",
    filename: "vital_formatter.py",
    code: pythonVitals,
  },
];
