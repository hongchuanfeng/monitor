import type { CodeExample } from "./types";

const csharpSerial = `using System;
using System.IO.Ports;
using System.Text;
using System.Threading;

/// <summary>
/// 监护仪串口连接示例。
/// 以 Philips IntelliVue / GE CARESCAPE 等常见 9600~115200 8N1 设备为例。
/// </summary>
public sealed class MonitorSerialClient : IDisposable
{
    private readonly SerialPort _port;
    private readonly object _writeLock = new();

    public MonitorSerialClient(string portName = "COM3", int baudRate = 115200)
    {
        _port = new SerialPort(portName, baudRate, Parity.None, 8, StopBits.One)
        {
            // 关键：ReadTimeout 避免 ReadLine/Read 永久阻塞。
            ReadTimeout = 2000,
            WriteTimeout = 2000,
            // 打开设备前先清空缓冲，避免上电自检的残留数据干扰首帧解析。
            DtrEnable = true,
            RtsEnable = true,
        };
    }

    public void Open()
    {
        if (_port.IsOpen) return;
        _port.Open();
        _port.DiscardInBuffer();
        _port.DiscardOutBuffer();
    }

    /// <summary>
    /// 发送一条命令并等待设备应答。实际项目中应改为基于事件驱动的帧缓存读取。
    /// </summary>
    public string SendAndReceive(string command, int timeoutMs = 2000)
    {
        lock (_writeLock)
        {
            _port.Write(command, 0, command.Length);
        }

        var sb = new StringBuilder();
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                // ReadLine 适用于 ASCII 行协议（GE CARESCAPE / Nihon Kohden）。
                var line = _port.ReadLine();
                if (line == null) continue;
                sb.Append(line).Append('\\n');
                if (IsFrameComplete(sb)) break;
            }
            catch (TimeoutException)
            {
                break;
            }
        }
        return sb.ToString();
    }

    private static bool IsFrameComplete(StringBuilder sb)
    {
        var s = sb.ToString();
        // 以换行或 ETX 判定帧结束，视具体协议调整。
        return s.EndsWith("\\n") || s.EndsWith("\\r") || s.Contains("\\u0004");
    }

    public void Dispose()
    {
        if (_port.IsOpen) _port.Close();
        _port.Dispose();
    }
}

// ---- 使用示例 ----
public static class Program
{
    public static void Main()
    {
        using var client = new MonitorSerialClient("COM3", 115200);
        client.Open();

        // 请求心率与血氧。以 Philips 为例，命令字随机型不同需查阅手册。
        var response = client.SendAndReceive("HR?\\r", timeoutMs: 2000);
        Console.WriteLine($"设备返回：{response}");

        // 生产环境建议改为后台线程持续读取 + 事件回调上报。
    }
}`;

const javaSerial = `import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * 监护仪串口连接示例（Java）。
 * 依赖：com.fazecast:jSerialComm:2.11.0
 */
public final class MonitorSerialClient implements AutoCloseable {

    // 帧缓存：串口是字节流，边界需要自己找
    private final StringBuilder buffer = new StringBuilder();

    public void open(String portName, int baudRate) throws IOException {
        SerialPort port = SerialPort.getCommPort(portName);
        port.setBaudRate(baudRate);
        port.setNumDataBits(8);
        port.setNumStopBits(SerialPort.ONE_STOP_BIT);
        port.setParity(SerialPort.NO_PARITY);
        // 读取超时设为 200ms，配合外层轮询实现非阻塞式读取
        port.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 200, 0);

        if (!port.openPort()) {
            throw new IOException("无法打开串口：" + portName);
        }
    }

    /** 发送命令并读取可用数据 */
    public String sendAndReceive(SerialPort port, String command, long timeoutMs)
            throws IOException, InterruptedException {

        OutputStream out = port.getOutputStream();
        out.write(command.getBytes(StandardCharsets.US_ASCII));
        out.flush();

        long deadline = System.currentTimeMillis() + timeoutMs;
        InputStream in = port.getInputStream();
        byte[] chunk = new byte[512];

        while (System.currentTimeMillis() < deadline) {
            int available = in.available();
            if (available > 0) {
                int read = in.read(chunk, 0, Math.min(available, chunk.length));
                buffer.append(new String(chunk, 0, read, StandardCharsets.US_ASCII));
                if (isFrameComplete()) {
                    break;
                }
            } else {
                TimeUnit.MILLISECONDS.sleep(20);
            }
        }
        return buffer.toString();
    }

    private boolean isFrameComplete() {
        String s = buffer.toString();
        return s.endsWith("\\n") || s.endsWith("\\r");
    }

    public void close(SerialPort port) {
        if (port != null && port.isOpen()) {
            port.closePort();
        }
    }

    public static void main(String[] args) throws Exception {
        SerialPort port = SerialPort.getCommPort("COM3");
        MonitorSerialClient client = new MonitorSerialClient();
        client.open("COM3", 115200);

        String response = client.sendAndReceive(port, "HR?\\r", 2000);
        System.out.println("设备返回：" + response);

        client.close(port);
    }
}`;

const csharpTcp = `using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// 以太网 / TCP 连接示例。
/// 适用于迈瑞 NetComm、Dräger DRX 等基于 TCP 的接口。
/// </summary>
public sealed class MonitorTcpClient : IDisposable
{
    private readonly string _host;
    private readonly int _port;
    private TcpClient? _client;
    private NetworkStream? _stream;

    public MonitorTcpClient(string host, int port)
    {
        _host = host;
        _port = port;
    }

    public async Task ConnectAsync(CancellationToken ct = default)
    {
        _client = new TcpClient { NoDelay = true };
        await _client.ConnectAsync(_host, _port, ct);
        _stream = _client.GetStream();
    }

    /// <summary>
    /// 按固定长度读取。适用于已知长度字段的二进制协议。
    /// </summary>
    public async Task<byte[]> ReadExactAsync(int count, CancellationToken ct = default)
    {
        if (_stream == null) throw new InvalidOperationException("尚未连接");

        var buffer = new byte[count];
        int offset = 0;
        while (offset < count)
        {
            int read = await _stream.ReadAsync(buffer.AsMemory(offset, count - offset), ct);
            if (read == 0) throw new IOException("连接被远端关闭");
            offset += read;
        }
        return buffer;
    }

    /// <summary>
    /// 读取以 STX/ETX 包围的一帧。迈瑞系协议以 0x7E 起始与结束。
    /// </summary>
    public async Task<byte[]> ReadFrameAsync(CancellationToken ct = default)
    {
        if (_stream == null) throw new InvalidOperationException("尚未连接");

        // 跳过起始符之前的噪声字节
        int b;
        while ((b = await _stream.ReadByteAsync(ct)) != -1)
        {
            if (b == 0x7E) break;
        }
        if (b == -1) throw new IOException("连接被远端关闭");

        using var ms = new MemoryStream();
        int prev = -1;
        while ((b = await _stream.ReadByteAsync(ct)) != -1)
        {
            // 连续两个 0x7E 表示帧结束
            if (b == 0x7E && prev == 0x7E) break;
            ms.WriteByte((byte)b);
            prev = b;
        }
        return ms.ToArray();
    }

    public async Task SendAsync(byte[] data, CancellationToken ct = default)
    {
        if (_stream == null) throw new InvalidOperationException("尚未连接");
        await _stream.WriteAsync(data, ct);
        await _stream.FlushAsync(ct);
    }

    public void Dispose()
    {
        _stream?.Dispose();
        _client?.Dispose();
    }
}`;

const javaTcp = `import java.io.DataInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * 以太网 / TCP 连接示例（Java）。
 * 适用于迈瑞 NetComm、Dräger DRX 等基于 TCP 的接口。
 */
public final class MonitorTcpClient implements AutoCloseable {

    private Socket socket;
    private DataInputStream in;
    private OutputStream out;

    public void connect(String host, int port, int timeoutMs) throws IOException {
        socket = new Socket();
        socket.connect(new InetSocketAddress(host, port), timeoutMs);
        socket.setTcpNoDelay(true);
        // 读超时设为 3 秒，避免 read 永久阻塞
        socket.setSoTimeout(3000);
        in = new DataInputStream(socket.getInputStream());
        out = socket.getOutputStream();
    }

    /** 读取以 0x7E 起始、连续两个 0x7E 结束的一帧（迈瑞系协议） */
    public byte[] readFrame() throws IOException {
        int b;
        // 跳过起始符之前的噪声
        while ((b = in.read()) != -1) {
            if (b == 0x7E) {
                break;
            }
        }
        if (b == -1) {
            throw new IOException("连接被远端关闭");
        }

        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        int prev = -1;
        while ((b = in.read()) != -1) {
            if (b == 0x7E && prev == 0x7E) {
                break;
            }
            buf.write(b);
            prev = b;
        }
        return buf.toByteArray();
    }

    public void send(byte[] data) throws IOException {
        out.write(data);
        out.flush();
    }

    public void send(String text) throws IOException {
        send(text.getBytes(StandardCharsets.US_ASCII));
    }

    @Override
    public void close() {
        try {
            if (socket != null) socket.close();
        } catch (IOException ignored) {
            // 关闭失败不影响退出
        }
    }

    public static void main(String[] args) throws Exception {
        try (MonitorTcpClient client = new MonitorTcpClient()) {
            client.connect("192.168.1.50", 4000, 5000);
            client.send("hello");
            byte[] frame = client.readFrame();
            System.out.println("收到 " + frame.length + " 字节");
        }
    }
}`;

const csharpParser = `using System;
using System.Collections.Generic;

/// <summary>
/// 帧解析器示例（C#）。
/// 目标协议：Philips IntelliVue 帧结构
///   STX(0x0B) | Type(1) | Seq(2) | Length(2) | Payload(N) | Checksum(1) | ETX(0x0D)
/// </summary>
public static class IntelliVueFrameParser
{
    private const byte Stx = 0x0B;
    private const byte Etx = 0x0D;

    public sealed class Frame
    {
        public byte Type { get; init; }
        public ushort Sequence { get; init; }
        public byte[] Payload { get; init; } = Array.Empty<byte>();
    }

    /// <summary>
    /// 从缓冲区中提取一帧。返回 null 表示数据不足；解析成功后应从缓冲区移除已消费的字节。
    /// </summary>
    public static Frame? TryParse(List<byte> buffer)
    {
        int start = buffer.IndexOf(Stx);
        if (start < 0)
        {
            buffer.Clear();
            return null;
        }
        if (start > 0) buffer.RemoveRange(0, start);

        // 最小帧长：STX + Type + Seq(2) + Len(2) + Checksum + ETX = 8
        if (buffer.Count < 8) return null;

        int len = (buffer[4] << 8) | buffer[5];
        int total = 8 + len;
        if (buffer.Count < total) return null;

        if (buffer[total - 1] != Etx)
        {
            // 帧尾异常，丢弃起始符后重新同步
            buffer.RemoveAt(0);
            return null;
        }

        // 校验和：帧头至负载区所有字节之和的低 8 位
        int sum = 0;
        for (int i = 1; i < 6 + len; i++) sum += buffer[i];
        if ((byte)(sum & 0xFF) != buffer[6 + len])
        {
            buffer.RemoveAt(0);
            return null;
        }

        var payload = buffer.GetRange(6, len).ToArray();
        var frame = new Frame
        {
            Type = buffer[1],
            Sequence = (ushort)((buffer[2] << 8) | buffer[3]),
            Payload = payload,
        };

        buffer.RemoveRange(0, total);
        return frame;
    }

    /// <summary>
    /// 解析测量项编号与数值。
    /// 注意：不同测量项的缩放因子不同，此处仅示范心率（整数 bpm）。
    /// </summary>
    public static int? ParseHeartRate(Frame frame)
    {
        if (frame.Type != 0x02) return null;   // 0x02 = 数值帧
        if (frame.Payload.Length < 3) return null;

        int itemId = (frame.Payload[0] << 8) | frame.Payload[1];
        if (itemId != 0x03) return null;       // 0x03 = 心率

        // 数值以定点存储，此处按手册给出的比例因子换算
        return (frame.Payload[2] << 8) | frame.Payload[3];
    }
}`;

const javaParser = `import java.util.ArrayList;
import java.util.List;

/**
 * 帧解析器示例（Java）。
 * 目标协议：Philips IntelliVue 帧结构
 *   STX(0x0B) | Type(1) | Seq(2) | Length(2) | Payload(N) | Checksum(1) | ETX(0x0D)
 */
public final class IntelliVueFrameParser {

    private static final byte STX = 0x0B;
    private static final byte ETX = 0x0D;

    public static final class Frame {
        public byte type;
        public int sequence;
        public byte[] payload = new byte[0];
    }

    /** 从缓冲区提取一帧，不足时返回 null */
    public static Frame tryParse(List<Byte> buffer) {
        int start = buffer.indexOf(STX);
        if (start < 0) {
            buffer.clear();
            return null;
        }
        if (start > 0) {
            buffer.subList(0, start).clear();
        }

        // 最小帧长 8 字节
        if (buffer.size() < 8) {
            return null;
        }

        int len = ((buffer.get(4) & 0xFF) << 8) | (buffer.get(5) & 0xFF);
        int total = 8 + len;
        if (buffer.size() < total) {
            return null;
        }

        if (buffer.get(total - 1) != ETX) {
            buffer.remove(0);
            return null;
        }

        int sum = 0;
        for (int i = 1; i < 6 + len; i++) {
            sum += (buffer.get(i) & 0xFF);
        }
        if ((byte) (sum & 0xFF) != buffer.get(6 + len)) {
            buffer.remove(0);
            return null;
        }

        Frame frame = new Frame();
        frame.type = buffer.get(1);
        frame.sequence = ((buffer.get(2) & 0xFF) << 8) | (buffer.get(3) & 0xFF);
        frame.payload = new byte[len];
        for (int i = 0; i < len; i++) {
            frame.payload[i] = buffer.get(6 + i);
        }

        buffer.subList(0, total).clear();
        return frame;
    }

    /** 解析心率（测量项编号 0x03） */
    public static Integer parseHeartRate(Frame frame) {
        if (frame.type != 0x02 || frame.payload.length < 4) {
            return null;
        }
        int itemId = ((frame.payload[0] & 0xFF) << 8) | (frame.payload[1] & 0xFF);
        if (itemId != 0x03) {
            return null;
        }
        return ((frame.payload[2] & 0xFF) << 8) | (frame.payload[3] & 0xFF);
    }

    /** 便捷方法：把读到的字节追加到缓冲区并尝试提取帧 */
    public static Frame feed(List<Byte> buffer, byte[] chunk) {
        for (byte b : chunk) {
            buffer.add(b);
        }
        return tryParse(buffer);
    }

    public static List<Byte> newBuffer() {
        return new ArrayList<>(512);
    }
}`;

const csharpReconnect = `using System;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// 断线重连与看门狗示例（C#）。
/// 设备侧在拔线、休眠或切换网络时可能静默断开，
/// 因此必须用「无数据超时」而不是「socket 异常」作为主要断线判据。
/// </summary>
public sealed class ReconnectingMonitorClient : IAsyncDisposable
{
    private readonly string _host;
    private readonly int _port;
    private readonly TimeSpan _idleTimeout = TimeSpan.FromSeconds(10);
    private readonly CancellationTokenSource _cts = new();

    private DateTime _lastDataAt = DateTime.UtcNow;

    public ReconnectingMonitorClient(string host, int port)
    {
        _host = host;
        _port = port;
    }

    public async Task RunAsync(Action<string> onData)
    {
        var ct = _cts.Token;
        var attempt = 0;

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var client = new MonitorTcpClient(_host, _port);
                await client.ConnectAsync(ct);
                attempt = 0;

                // 每次成功连接都重置退避
                var watchdog = Task.Run(async () =>
                {
                    while (!ct.IsCancellationRequested)
                    {
                        if (DateTime.UtcNow - _lastDataAt > _idleTimeout)
                        {
                            ct.Cancel();
                            break;
                        }
                        await Task.Delay(1000, CancellationToken.None);
                    }
                }, ct);

                while (!ct.IsCancellationRequested)
                {
                    var frame = await client.ReadFrameAsync(ct);
                    _lastDataAt = DateTime.UtcNow;
                    onData(Convert.ToHexString(frame));
                }

                await watchdog;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                attempt++;
                // 指数退避，上限 30 秒，避免设备断电时打满日志
                var delay = TimeSpan.FromSeconds(Math.Min(30, Math.Pow(2, Math.Min(attempt, 5))));
                Console.Error.WriteLine($"连接失败（第 {attempt} 次）：{ex.Message}，{delay.TotalSeconds:F0}s 后重试");
                try { await Task.Delay(delay, ct); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _cts.Cancel();
        _cts.Dispose();
        await Task.CompletedTask;
    }
}`;

const javaReconnect = `import java.io.IOException;
import java.net.Socket;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * 断线重连与看门狗示例（Java）。
 * 断线判据以「数据静默超时」为主，而非仅依赖 socket 异常。
 */
public final class ReconnectingMonitorClient implements AutoCloseable {

    private final String host;
    private final int port;
    private final long idleTimeoutMs = 10_000;
    private final AtomicLong lastDataAt = new AtomicLong(System.currentTimeMillis());
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public ReconnectingMonitorClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void run(Consumer<byte[]> onData) {
        int attempt = 0;

        while (!Thread.currentThread().isInterrupted()) {
            try (MonitorTcpClient client = new MonitorTcpClient()) {
                client.connect(host, port, 5000);
                attempt = 0;

                // 看门狗：无数据超过阈值则主动断开，触发重连
                scheduler.scheduleAtFixedRate(() -> {
                    if (System.currentTimeMillis() - lastDataAt.get() > idleTimeoutMs) {
                        Thread.currentThread().interrupt();
                    }
                }, 1, 1, TimeUnit.SECONDS);

                byte[] frame;
                while ((frame = client.readFrame()) != null) {
                    lastDataAt.set(System.currentTimeMillis());
                    onData.accept(frame);
                }
            } catch (IOException e) {
                attempt++;
                long delayMs = Math.min(30_000L, (long) (Math.pow(2, Math.min(attempt, 5)) * 1000));
                System.err.printf("连接失败（第 %d 次）：%s，%d ms 后重试%n",
                        attempt, e.getMessage(), delayMs);
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }

    @Override
    public void close() {
        scheduler.shutdownNow();
    }
}`;

const csharpVitals = `using System;
using System.Collections.Generic;
using System.Globalization;

/// <summary>
/// 读取生理参数并输出示例（C#）。
/// 演示如何把帧解析结果映射为带单位的参数对象，
/// 并把「无效读数」与「真实数值 0」区分开。
/// </summary>
public sealed class VitalSign
{
    public required string Name { get; init; }
    public required string Unit { get; init; }
    public double? Value { get; init; }
    public bool IsValid => Value.HasValue;
}

public static class VitalFormatter
{
    /// <summary>
    /// 解析迈瑞 BeneVision 的测量项类型与数值。
    /// 缩放因子按厂商参数表：心率 ×0.1，血氧 ×1，其余依文档。
    /// </summary>
    public static VitalSign? ParseMindray(byte[] payload)
    {
        if (payload.Length < 3) return null;

        int itemType = payload[0];
        int raw = (payload[1] << 8) | payload[2];

        return itemType switch
        {
            0x01 => new VitalSign { Name = "HR", Unit = "bpm", Value = raw * 0.1 },
            0x02 => new VitalSign { Name = "SpO2", Unit = "%", Value = raw },
            0x03 => new VitalSign { Name = "RR", Unit = "bpm", Value = raw * 0.1 },
            0x04 => new VitalSign { Name = "T", Unit = "°C", Value = raw * 0.1 },
            _ => null,
        };
    }

    /// <summary>
    /// 输出为可读文本。无效值显示为「--」而非 0，避免下游误判为生理零值。
    /// </summary>
    public static string Format(VitalSign v)
    {
        if (!v.IsValid) return $"{v.Name}: -- {v.Unit}";
        return string.Format(
            CultureInfo.InvariantCulture,
            "{0}: {1:F1} {2}",
            v.Name,
            v.Value!.Value,
            v.Unit);
    }

    /// <summary>
    /// 汇总为一条 JSON 风格输出，便于接入日志或消息队列。
    /// </summary>
    public static string ToLine(IEnumerable<VitalSign> vitals)
    {
        var parts = new List<string>();
        foreach (var v in vitals)
        {
            parts.Add(v.IsValid
                ? $"\\"{v.Name}\\":{v.Value!.Value.ToString("F1", CultureInfo.InvariantCulture)}"
                : $"\\"{v.Name}\\":null");
        }
        return "{" + string.Join(",", parts) + "}";
    }
}`;

const javaVitals = `import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 读取生理参数并输出示例（Java）。
 * 关键点：区分「无效读数」与「真实数值 0」。
 */
public final class VitalFormatter {

    public static final class Vital {
        public final String name;
        public final String unit;
        public final Double value;

        Vital(String name, String unit, Double value) {
            this.name = name;
            this.unit = unit;
            this.value = value;
        }

        public boolean isValid() {
            return value != null;
        }
    }

    /** 解析迈瑞 BeneVision 测量项类型与数值，缩放因子按厂商参数表 */
    public static Vital parseMindray(byte[] payload) {
        if (payload.length < 3) {
            return null;
        }
        int itemType = payload[0] & 0xFF;
        int raw = ((payload[1] & 0xFF) << 8) | (payload[2] & 0xFF);

        switch (itemType) {
            case 0x01:
                return new Vital("HR", "bpm", raw * 0.1);
            case 0x02:
                return new Vital("SpO2", "%", (double) raw);
            case 0x03:
                return new Vital("RR", "bpm", raw * 0.1);
            case 0x04:
                return new Vital("T", "°C", raw * 0.1);
            default:
                return null;
        }
    }

    /** 无效读数显示为 --，不显示 0 */
    public static String format(Vital v) {
        if (!v.isValid()) {
            return v.name + ": -- " + v.unit;
        }
        return String.format(Locale.ROOT, "%s: %.1f %s", v.name, v.value, v.unit);
    }

    /** 汇总输出 */
    public static String toLine(List<Vital> vitals) {
        List<String> parts = new ArrayList<>();
        for (Vital v : vitals) {
            if (v.isValid()) {
                parts.add("\\"" + v.name + "\\":" + String.format(Locale.ROOT, "%.1f", v.value));
            } else {
                parts.add("\\"" + v.name + "\\":null");
            }
        }
        return "{" + String.join(",", parts) + "}";
    }
}`;

export const codeExamples: CodeExample[] = [
  {
    slug: "serial-connect",
    title: "串口连接",
    desc: "打开串口、配置波特率与超时、发送查询命令并读取应答。适用于 RS-232 / RS-485 设备，覆盖 Philips、GE、迈瑞等主流机型。",
    lang: "csharp",
    filename: "MonitorSerialClient.cs",
    dependency: "System.IO.Ports 4.x（.NET 6+ 内置）",
    code: csharpSerial,
  },
  {
    slug: "serial-connect",
    title: "串口连接",
    desc: "使用 jSerialComm 打开串口，处理超时与字节流边界，适用于 Windows 与 Linux 环境。",
    lang: "java",
    filename: "MonitorSerialClient.java",
    dependency: "com.fazecast:jSerialComm:2.11.0",
    code: javaSerial,
  },
  {
    slug: "tcp-connect",
    title: "TCP 连接",
    desc: "通过 TCP 连接设备的以太网接口，演示定长读取与 STX/ETX 帧边界识别，适用于迈瑞 NetComm、Dräger DRX。",
    lang: "csharp",
    filename: "MonitorTcpClient.cs",
    code: csharpTcp,
  },
  {
    slug: "tcp-connect",
    title: "TCP 连接",
    desc: "Java 版 TCP 连接实现，包含帧边界识别与连接参数设置。",
    lang: "java",
    filename: "MonitorTcpClient.java",
    code: javaTcp,
  },
  {
    slug: "frame-parser",
    title: "帧解析器",
    desc: "从字节流中切分完整帧，校验帧尾与校验和，解析测量项编号与数值。",
    lang: "csharp",
    filename: "IntelliVueFrameParser.cs",
    code: csharpParser,
  },
  {
    slug: "frame-parser",
    title: "帧解析器",
    desc: "Java 版帧解析器，同样的边界识别与校验逻辑，可与 C# 实现逐行对照。",
    lang: "java",
    filename: "IntelliVueFrameParser.java",
    code: javaParser,
  },
  {
    slug: "reconnect",
    title: "断线重连与看门狗",
    desc: "以数据静默超时作为主要断线判据，配合指数退避重连，避免设备断电时日志刷屏。",
    lang: "csharp",
    filename: "ReconnectingMonitorClient.cs",
    code: csharpReconnect,
  },
  {
    slug: "reconnect",
    title: "断线重连与看门狗",
    desc: "Java 版重连实现，使用调度线程做看门狗检测。",
    lang: "java",
    filename: "ReconnectingMonitorClient.java",
    code: javaReconnect,
  },
  {
    slug: "vital-output",
    title: "读取生理参数并输出",
    desc: "把帧解析结果映射为带单位的参数对象，严格区分「无效读数」与「真实数值 0」，并输出为 JSON 风格文本。",
    lang: "csharp",
    filename: "VitalFormatter.cs",
    code: csharpVitals,
  },
  {
    slug: "vital-output",
    title: "读取生理参数并输出",
    desc: "Java 版参数映射与输出，逻辑与 C# 版一致，便于跨语言对照与迁移。",
    lang: "java",
    filename: "VitalFormatter.java",
    code: javaVitals,
  },
];

export const codeExampleGroups = [
  { slug: "serial-connect", title: "串口连接", desc: "打开串口并完成一次命令往返" },
  { slug: "tcp-connect", title: "TCP 连接", desc: "接入以太网接口" },
  { slug: "frame-parser", title: "帧解析器", desc: "从字节流切分并校验完整帧" },
  { slug: "reconnect", title: "断线重连与看门狗", desc: "静默超时检测与指数退避重连" },
  { slug: "vital-output", title: "读取生理参数并输出", desc: "参数映射与格式化输出" },
];
