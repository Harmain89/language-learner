import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Tier(Base):
    __tablename__ = "tiers"

    id = Column(String, primary_key=True, default=generate_uuid)
    number = Column(Integer, unique=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    modules = relationship("TopicModule", back_populates="tier", cascade="all, delete-orphan", order_by="TopicModule.order_index")


class TopicModule(Base):
    __tablename__ = "topic_modules"

    id = Column(String, primary_key=True, default=generate_uuid)
    tier_id = Column(String, ForeignKey("tiers.id"), nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    theory_markdown = Column(Text, nullable=False)
    gotchas_markdown = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    visualizer_mode = Column(String, default="memory")  # 'memory', 'recursion', 'algorithm', 'bytecode'
    challenge_prompt = Column(Text, nullable=False)
    test_code = Column(Text, nullable=False)
    order_index = Column(Integer, default=0)

    tier = relationship("Tier", back_populates="modules")
    progress = relationship("UserProgress", back_populates="module", uselist=False, cascade="all, delete-orphan")


class GotchaChallenge(Base):
    __tablename__ = "gotcha_challenges"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    tricky_code = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)  # JSON-encoded array of options
    correct_output = Column(String, nullable=False)
    deep_explanation = Column(Text, nullable=False)


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(String, primary_key=True, default=generate_uuid)
    module_id = Column(String, ForeignKey("topic_modules.id"), unique=True, nullable=False)
    status = Column(String, default="not_started")  # 'not_started', 'in_progress', 'completed'
    saved_code = Column(Text, nullable=True)
    user_notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    module = relationship("TopicModule", back_populates="progress")


class ExecutionSnippet(Base):
    __tablename__ = "execution_snippets"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LeetCodeProblem(Base):
    __tablename__ = "leetcode_problems"

    id = Column(String, primary_key=True, default=generate_uuid)
    number = Column(Integer, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)  # 'Easy', 'Medium', 'Hard'
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    test_code = Column(Text, nullable=False)
    time_complexity = Column(String, default="O(N)")
    space_complexity = Column(String, default="O(1)")
    hints = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)

