require 'webrick'

class NoCacheServlet < WEBrick::HTTPServlet::FileHandler
  def do_GET(req, res)
    super
    res['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    res['Pragma'] = 'no-cache'
    res['Expires'] = '0'
  end
end

root_dir = File.expand_path('dist', __dir__)

server = WEBrick::HTTPServer.new(
  Port: 3000,
  DocumentRoot: root_dir,
  AccessLog: [],
  Logger: WEBrick::Log.new(nil, WEBrick::BasicLog::WARN)
)

server.mount('/', NoCacheServlet, root_dir)

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

puts "Server running with NoCache on port 3000"
server.start
