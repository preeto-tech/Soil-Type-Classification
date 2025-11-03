import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional

class ChatDatabase:
    def __init__(self, db_path="chat_history.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def create_session(self, session_id: str) -> bool:
        """Create a new chat session"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (session_id) VALUES (?)",
                (session_id,)
            )
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False
    
    def add_message(self, session_id: str, role: str, content: str) -> bool:
        """Add a message to the session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Update session last activity
        cursor.execute(
            "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?",
            (session_id,)
        )
        
        # Insert message
        cursor.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content)
        )
        
        conn.commit()
        conn.close()
        return True
    
    def get_session_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Get chat history for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT role, content, timestamp 
            FROM messages 
            WHERE session_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
            """,
            (session_id, limit)
        )
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "role": row[0],
                "content": row[1],
                "timestamp": row[2]
            })
        
        conn.close()
        # Reverse to get chronological order
        return list(reversed(messages))
    
    def clear_session(self, session_id: str) -> bool:
        """Clear all messages for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        
        conn.commit()
        conn.close()
        return True
    
    def get_all_sessions(self) -> List[Dict]:
        """Get all active sessions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT session_id, created_at, last_activity 
            FROM sessions 
            ORDER BY last_activity DESC
            """
        )
        
        sessions = []
        for row in cursor.fetchall():
            sessions.append({
                "session_id": row[0],
                "created_at": row[1],
                "last_activity": row[2]
            })
        
        conn.close()
        return sessions

