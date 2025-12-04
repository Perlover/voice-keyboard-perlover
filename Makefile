.PHONY: all clean install uninstall deb deb-install deb-clean deps-install help

PACKAGE_NAME = voice-keyboard-perlover
VERSION = 1.4.0
APPLET_UUID = voice-keyboard@perlover

PREFIX ?= /usr
DESTDIR ?=

APPLET_DIR = $(DESTDIR)$(PREFIX)/share/cinnamon/applets/$(APPLET_UUID)
BIN_DIR = $(DESTDIR)$(PREFIX)/bin

all: help

help:
	@echo "Voice Keyboard Perlover - Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make install       - Install applet and script to system (manual)"
	@echo "  make uninstall     - Remove applet and script from system"
	@echo "  make deb           - Build .deb package"
	@echo "  make deb-install   - Build and install .deb with all dependencies (RECOMMENDED)"
	@echo "  make deps-install  - Install build dependencies (debhelper, dpkg-dev, gjs)"
	@echo "  make deb-clean     - Clean build artifacts"
	@echo "  make clean         - Clean all generated files"
	@echo "  make help          - Show this help message"
	@echo ""

install:
	@echo "Installing $(PACKAGE_NAME)..."
	install -d $(APPLET_DIR)
	cp -r applet/$(APPLET_UUID)/* $(APPLET_DIR)/
	install -d $(BIN_DIR)
	install -m 0755 scripts/whisper-voice-input $(BIN_DIR)/whisper-voice-input
	@echo ""
	@echo "Installation complete!"
	@echo "Restart Cinnamon or log out/in to see the applet in the Applets menu."
	@echo ""

uninstall:
	@echo "Uninstalling $(PACKAGE_NAME)..."
	rm -rf $(APPLET_DIR)
	rm -f $(BIN_DIR)/whisper-voice-input
	@echo "Uninstallation complete!"
	@echo ""

deb:
	@echo "Building .deb package..."
	@if ! command -v dpkg-buildpackage >/dev/null 2>&1; then \
		echo "ERROR: dpkg-buildpackage not found. Install it with:"; \
		echo "  sudo apt-get install dpkg-dev debhelper"; \
		exit 1; \
	fi
	dpkg-buildpackage -us -uc -b
	@echo ""
	@echo "Package built successfully!"
	@echo "Install it with: make deb-install"
	@echo "Or manually: sudo apt install ../$(PACKAGE_NAME)_$(VERSION)-1_all.deb"
	@echo ""

deps-install:
	@missing=""; \
	command -v dpkg-buildpackage >/dev/null 2>&1 || missing="$$missing dpkg-dev"; \
	command -v dh >/dev/null 2>&1 || missing="$$missing debhelper"; \
	command -v gjs >/dev/null 2>&1 || missing="$$missing gjs"; \
	if [ -n "$$missing" ]; then \
		echo "Installing missing build dependencies:$$missing"; \
		sudo apt-get install -y $$missing; \
		echo "Build dependencies installed."; \
		echo ""; \
	fi

deb-install: deps-install deb
	@echo "Installing package with dependencies..."
	@if [ ! -f ../$(PACKAGE_NAME)_$(VERSION)-1_all.deb ]; then \
		echo "ERROR: Package file not found!"; \
		exit 1; \
	fi
	@echo "Using apt to install with automatic dependency resolution..."
	sudo apt install -y ../$(PACKAGE_NAME)_$(VERSION)-1_all.deb
	@echo ""
	@echo "======================================================================"
	@echo "  ✓ Installation completed successfully!"
	@echo "======================================================================"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Right-click on your Cinnamon panel"
	@echo "  2. Select 'Applets'"
	@echo "  3. Find 'Keyboard + Voice Input'"
	@echo "  4. Click 'Add to panel'"
	@echo ""
	@echo "If the applet doesn't appear, restart Cinnamon (Ctrl+Alt+Esc)"
	@echo ""

deb-clean:
	@echo "Cleaning build artifacts..."
	dh_clean
	rm -rf debian/.debhelper debian/$(PACKAGE_NAME) debian/files debian/*.debhelper* debian/*.substvars
	rm -f ../$(PACKAGE_NAME)_$(VERSION)-1_all.deb ../$(PACKAGE_NAME)_$(VERSION)-1_all.buildinfo ../$(PACKAGE_NAME)_$(VERSION)-1_all.changes
	@echo "Clean complete!"

clean: deb-clean
	@echo "Cleaning all generated files..."
	find . -type f -name "*~" -delete
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "All clean!"
