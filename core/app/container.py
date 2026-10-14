from app.adapters.billing import PlaceholderBilling
from app.adapters.gateway import Gateway
from app.adapters.mailer import SmtpMailer
from app.adapters.queue import PgQueue
from app.adapters.storage import MinioStorage

gateway = Gateway()
storage = MinioStorage()
billing = PlaceholderBilling()
mailer = SmtpMailer()
queue = PgQueue()
