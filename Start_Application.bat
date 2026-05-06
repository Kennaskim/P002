@echo off
echo =======================================================
echo Starting Second-Hand School Textbook Exchange System...
echo =======================================================

:: Start the Django Backend in a new command window
echo Starting Backend Server...
start cmd /k "cd backend && python -m venv venv && call venv\Scripts\activate && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver"

:: Start the React Frontend in a new command window
echo Starting Frontend Server...
start cmd /k "cd frontend && npm install && npm run dev"

echo Both servers are starting up!
echo Please wait a moment, then open your browser to http://localhost:5173
pause