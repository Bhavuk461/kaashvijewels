import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function Contact() {
  const { showToast } = useCart();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'We deliver within 3-5 business days across India. Metro cities usually receive orders within 2-3 days. You will receive a tracking link once your order is shipped.',
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer 7-day easy returns. Products must be unused and in original packaging. Simply contact us via email or phone, and we will arrange a pickup at no extra cost.',
    },
    {
      question: 'Are your products hypoallergenic?',
      answer: 'Yes! Our anti-tarnish collection is hypoallergenic and safe for sensitive skin. The special coating prevents direct metal contact, making them comfortable for all-day wear.',
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast('💌 Message sent! We\'ll get back to you within 24 hours.', 'success');
    setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      {/* ═══ Page Header ═══ */}
      <section className="page-header">
        <div className="container">
          <h1>Get in Touch</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)', fontSize: '1.1rem', maxWidth: '600px', margin: 'var(--space-sm) auto 0' }}>
            We&apos;d love to hear from you! Whether you have a question, feedback, or just want to say hello — drop us a line.
          </p>
          <div className="divider" />
        </div>
      </section>

      {/* ═══ Contact Content ═══ */}
      <div className="container">
        <div className="contact-grid">

          {/* ── Contact Form ── */}
          <div>
            <h3 style={{ marginBottom: 'var(--space-xl)' }}>Send Us a Message</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="contact-name">Name</label>
                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-subject">Subject</label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Returns">Returns</option>
                  <option value="Collaboration">Collaboration</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="6"
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
              >
                Send Message 💌
              </button>
            </form>
          </div>

          {/* ── Contact Info & FAQ ── */}
          <div>
            <h3 style={{ marginBottom: 'var(--space-xl)' }}>Contact Information</h3>

            {/* Email */}
            <div className="contact-info-item">
              <div className="contact-info-item__icon">📧</div>
              <div>
                <div className="contact-info-item__label">Email</div>
                <div className="contact-info-item__value">
                  <a href="mailto:kaashvijewels@gmail.com" style={{ color: 'var(--color-primary-dark)' }}>
                    kaashvijewels@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="contact-info-item">
              <div className="contact-info-item__icon">📱</div>
              <div>
                <div className="contact-info-item__label">Phone</div>
                <div className="contact-info-item__value">
                  <a href="https://wa.me/919871796965" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-dark)' }}>
                    +91 98717 96965
                  </a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="contact-info-item">
              <div className="contact-info-item__icon">📍</div>
              <div>
                <div className="contact-info-item__label">Address</div>
                <div className="contact-info-item__value">New Delhi, India</div>
              </div>
            </div>

            {/* Hours */}
            <div className="contact-info-item">
              <div className="contact-info-item__icon">⏰</div>
              <div>
                <div className="contact-info-item__label">Business Hours</div>
                <div className="contact-info-item__value">Mon – Sat, 10AM – 7PM IST</div>
              </div>
            </div>

            {/* FAQ Section */}
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)' }}>Frequently Asked Questions</h3>

              {faqs.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-md)',
                    overflow: 'hidden',
                    transition: 'all 300ms ease',
                  }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: openFaq === index ? 'var(--color-primary-lighter)' : 'var(--color-bg-card)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      border: 'none',
                      fontFamily: 'var(--font-body)',
                      textAlign: 'left',
                      transition: 'background 200ms ease',
                    }}
                  >
                    <span>{faq.question}</span>
                    <span
                      style={{
                        fontSize: '1.2rem',
                        transition: 'transform 300ms ease',
                        transform: openFaq === index ? 'rotate(45deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                        marginLeft: 'var(--space-md)',
                      }}
                    >
                      +
                    </span>
                  </button>

                  <div
                    style={{
                      maxHeight: openFaq === index ? '200px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 300ms ease, padding 300ms ease',
                      padding: openFaq === index ? 'var(--space-lg)' : '0 var(--space-lg)',
                      background: 'var(--color-bg-card)',
                    }}
                  >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
